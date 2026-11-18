#!/usr/bin/env python
"""本地 OpenAI 兼容语音转录服务（用于 Lab Match AI 纪要链路验收）。

后端 services/interviewAiProviders.transcribe() 发出的请求形如：
    POST /v1/audio/transcriptions
    Content-Type: multipart/form-data
    file=<wav>, model=<name>, language=zh, response_format=verbose_json,
    timestamp_granularities[]=segment
响应需要能被解析出 body.segments[]，每项含 start / end / text。

本服务用 faster-whisper（CTranslate2）在本机推理，不依赖 HuggingFace 在线下载：
模型目录由 STT_MODEL_DIR 指定（可从 ModelScope 获取）。

用法：
    python scripts/stt-server.py                     # 默认 127.0.0.1:8000
    STT_MODEL_DIR=D:/models/faster-whisper-large-v3 python scripts/stt-server.py

安全说明：只监听回环地址，不对外暴露；后端要求 STT 地址为 https，
只有 localhost / 127.0.0.1 / [::1] 才允许 http，正好对应本服务。
"""
import json
import os
import sys
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOST = os.environ.get("STT_HOST", "127.0.0.1")
PORT = int(os.environ.get("STT_PORT", "8000"))
_DEFAULT_MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tools", "models",
                                  "faster-whisper-large-v3")
MODEL_DIR = os.environ.get("STT_MODEL_DIR") or os.path.normpath(_DEFAULT_MODEL_DIR)
DEVICE = os.environ.get("STT_DEVICE", "cuda")
COMPUTE = os.environ.get("STT_COMPUTE_TYPE", "float16")

model = None


def register_cuda_dlls():
    """把 pip 装进来的 CUDA 运行库目录挂进 DLL 搜索路径。

    ctranslate2 需要 cublas64_12.dll / cudnn64_9.dll，pip 版 nvidia-* 包
    把它们放在 site-packages/nvidia/<组件>/bin 下，默认不在 PATH 里。
    """
    if os.name != "nt" or not hasattr(os, "add_dll_directory"):
        return
    try:
        import site

        roots = []
        for base in site.getsitepackages() + [site.getusersitepackages()]:
            candidate = os.path.join(base, "nvidia")
            if os.path.isdir(candidate):
                roots.append(candidate)
        for root in roots:
            for name in os.listdir(root):
                bin_dir = os.path.join(root, name, "bin")
                if os.path.isdir(bin_dir):
                    os.add_dll_directory(bin_dir)
                    # ctranslate2 的加载器不走 add_dll_directory，必须同时塞进 PATH
                    os.environ["PATH"] = bin_dir + os.pathsep + os.environ.get("PATH", "")
                    print("[stt] dll path added: %s" % bin_dir, flush=True)
    except Exception as error:
        print("[stt] 注册 CUDA 库目录失败：%s" % error, flush=True)


def load_model():
    global model
    if model is not None:
        return model
    from faster_whisper import WhisperModel

    if not MODEL_DIR and not os.path.isdir(MODEL_DIR or ""):
        raise SystemExit(
            "未指定可用的 STT_MODEL_DIR；本机无法访问 HuggingFace，"
            "请先把 CTranslate2 格式模型下载到本地目录再启动。"
        )
    if DEVICE == "cuda":
        register_cuda_dlls()
    print("[stt] loading model from %s (device=%s, compute=%s)" % (MODEL_DIR, DEVICE, COMPUTE), flush=True)
    model = WhisperModel(MODEL_DIR, device=DEVICE, compute_type=COMPUTE)
    print("[stt] model ready", flush=True)
    return model


def parse_multipart(body, content_type):
    """极简 multipart 解析：只处理 name/value 与单个文件。"""
    marker = "boundary="
    if marker not in content_type:
        return {}
    boundary = content_type.split(marker, 1)[1].strip().strip('"')
    sep = b"--" + boundary.encode()
    fields = {}
    for chunk in body.split(sep):
        if not chunk or chunk in (b"--\r\n", b"--"):
            continue
        chunk = chunk.lstrip(b"\r\n")
        if b"\r\n\r\n" not in chunk:
            continue
        head, payload = chunk.split(b"\r\n\r\n", 1)
        payload = payload[:-2] if payload.endswith(b"\r\n") else payload
        disposition = ""
        for line in head.decode("utf-8", "replace").split("\r\n"):
            if line.lower().startswith("content-disposition"):
                disposition = line
        name = ""
        filename = ""
        for part in disposition.split(";"):
            part = part.strip()
            if part.startswith("name="):
                name = part[5:].strip('"')
            elif part.startswith("filename="):
                filename = part[9:].strip('"')
        if not name:
            continue
        fields[name] = {"filename": filename, "data": payload}
    return fields


def read_wav(path):
    """自己解 WAV，绕开 faster-whisper 依赖的 av 版本兼容问题。

    后端固定送来 16kHz 单声道 pcm_s16le，这里只处理这一种格式。
    """
    import wave

    import numpy as np

    with wave.open(path, "rb") as handle:
        channels = handle.getnchannels()
        width = handle.getsampwidth()
        rate = handle.getframerate()
        frames = handle.readframes(handle.getnframes())
    if width != 2:
        raise ValueError("仅支持 16 bit PCM，实际为 %d bit" % (width * 8))
    audio = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
    if channels > 1:
        audio = audio.reshape(-1, channels).mean(axis=1)
    if rate != 16000:
        raise ValueError("采样率需为 16000，实际为 %d" % rate)
    return audio


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):  # 保持日志干净
        sys.stderr.write("[stt] %s\n" % (fmt % args))

    def _json(self, code, payload):
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        if self.path.rstrip("/") in ("/health", "/v1/health"):
            self._json(200, {"status": "UP"})
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self):
        if self.path.rstrip("/") != "/v1/audio/transcriptions":
            self._json(404, {"error": "not found"})
            return
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > 200 * 1024 * 1024:
            self._json(400, {"error": "invalid body"})
            return
        body = self.rfile.read(length)
        fields = parse_multipart(body, self.headers.get("Content-Type") or "")
        audio = fields.get("file")
        if not audio or not audio["data"]:
            self._json(400, {"error": "missing file"})
            return
        language = (fields.get("language") or {}).get("data", b"zh").decode("utf-8", "replace") or "zh"

        suffix = os.path.splitext(audio["filename"] or "audio.wav")[1] or ".wav"
        handle, path = tempfile.mkstemp(suffix=suffix)
        try:
            with os.fdopen(handle, "wb") as fh:
                fh.write(audio["data"])
            segments, info = load_model().transcribe(
                read_wav(path), language=language, beam_size=1, vad_filter=True,
                condition_on_previous_text=False,
            )
            rows = []
            for index, item in enumerate(segments):
                rows.append({
                    "id": index,
                    "start": round(float(item.start), 3),
                    "end": round(float(item.end), 3),
                    "text": item.text.strip(),
                    "no_speech_prob": round(float(getattr(item, "no_speech_prob", 0.0)), 4),
                })
        except Exception as error:  # 转写失败要让后端看到明确错误
            import traceback

            traceback.print_exc()
            self._json(500, {"error": "transcribe failed: %s" % error})
            return
        finally:
            try:
                os.unlink(path)
            except OSError:
                pass

        self._json(200, {
            "task": "transcribe",
            "language": getattr(info, "language", language),
            "duration": round(float(getattr(info, "duration", 0.0)), 3),
            "text": "".join(row["text"] for row in rows),
            "segments": rows,
        })


def main():
    load_model()
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print("[stt] listening on http://%s:%d/v1/audio/transcriptions" % (HOST, PORT), flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
