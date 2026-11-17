# Lab Match 部署说明

本文面向学院运维人员，说明如何把 Lab Match 部署到一台 Linux 服务器上并完成自检。

> 本文件只描述部署方法与检查项。真实密钥一律写入服务器上的 `backend/.env`，该文件已被 `.gitignore` 排除，不得提交到仓库。

---

## 一、环境要求

| 项目 | 要求 | 说明 |
| --- | --- | --- |
| 操作系统 | Linux（Ubuntu 22.04 / Debian 12 验证路径） | Windows Server 亦可，命令需相应替换 |
| Node.js | 20 LTS 或以上 | 前后端共用同一版本 |
| npm | 8 或以上 | |
| 反向代理 | Nginx 1.18 或以上 | 提供 HTTPS 与静态资源托管 |
| 数据库 | 可选 MySQL 8 | 默认 JSON 文件存储可满足单机使用 |
| 磁盘 | ≥ 20 GB | 录像、逐字稿、简历等文件占用较大 |

外部服务（按需）：

- **LiveKit Cloud**：线上面试必需，否则面试功能不可用。
- **S3 兼容对象存储**：会议录像归档必需。
- **语音识别服务（faster-whisper 兼容）**：逐字稿必需。
- **DeepSeek API**：AI 会议纪要必需。

上述任一项未配置时，对应功能整体关闭，其余业务不受影响。

---

## 二、获取代码与安装依赖

```bash
git clone <仓库地址> /opt/lab_match
cd /opt/lab_match

cd backend && npm ci && cd ..
cd frontend && npm ci && cd ..
```

> 仓库保留早期 Spring Boot 骨架（`backend/pom.xml`、`backend/src/main/java`）与 `V2/` 参考目录，均不参与运行，无需构建。

---

## 三、配置环境变量

```bash
cd /opt/lab_match/backend
cp .env.example .env
chmod 600 .env          # 仅服务账号可读
```

必填项：

| 变量 | 说明 |
| --- | --- |
| `PORT` | 后端监听端口，默认 `8080` |
| `DB_DRIVER` | `file` 或 `mysql` |
| `JWT_SECRET` | **必须改为 32 位以上随机串**，否则登录令牌可被伪造 |
| `CORS_ORIGIN` | 前端访问域名，如 `https://lab.example.edu.cn`；多个用逗号分隔 |
| `TRUST_PROXY` | 部署在 Nginx 之后设为 `1`，限流才能取到真实客户端 IP |

生成随机密钥：

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

MySQL 模式追加：

```ini
DB_DRIVER=mysql
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=lab_match
MYSQL_PASSWORD=<数据库密码>
MYSQL_DATABASE=lab_match
MYSQL_POOL_SIZE=5
```

限流（可选，默认值已可用）：

```ini
API_RATE_MAX=3000
API_RATE_WINDOW_MS=60000
LOGIN_RATE_MAX=10
LOGIN_RATE_WINDOW_MS=600000
```

> `LAB_RATE_LIMIT=off` 仅用于本地排障，生产环境不要设置。

---

## 四、数据库准备

### 方式 A：JSON 文件存储（默认，适合单机小规模）

无需额外操作。首次启动会在 `backend/data/.store.json` 自动写入初始数据。

- 备份方式：定期复制该文件。
- 限制：单进程串行写入，不支持多实例同时写入同一文件。

### 方式 B：MySQL 8

```bash
# 1) 建库与账号（在 MySQL 中执行）
CREATE DATABASE lab_match DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'lab_match'@'127.0.0.1' IDENTIFIED BY '<数据库密码>';
GRANT ALL PRIVILEGES ON lab_match.* TO 'lab_match'@'127.0.0.1';
FLUSH PRIVILEGES;

# 2) 建表与迁移（可重复执行，内部按 v2 → v12 顺序应用增量迁移）
cd /opt/lab_match/backend
npm run db:init

# 3) 校验连接与数据量
npm run db:check
```

迁移脚本位于 `database/`，编号 `migration_v2.sql` … `migration_v12.sql`，按序应用。上线前可先做静态校验：

```bash
node database/verify.js
```

> **注意**：`database/verify.js` 只做静态检查（编号连续性、DDL 完整性、表映射覆盖）。首次在目标库执行迁移前，请先在**测试库**跑一遍 `npm run db:init` 并用 `npm run db:check` 确认，再对生产库执行。迁移只做新增与修改，不删除既有表。

---

## 五、初始化账号

全新数据源需要建立学院负责人与各实训室组长账号：

```bash
cd /opt/lab_match/backend
npm run init:college            # 幂等：已存在则只校正角色与绑定
npm run accounts:report         # 只读：查看账号及关联业务记录
```

- 初始密码由 `backend/utils/accountCredentials.js` 中的常量决定，账号首次登录会被强制要求修改密码。
- 如需把密码重置回初始值：`npm run init:college -- --reset-passwords`。
- **不要**在数据库中直接写入明文密码；密码以 bcrypt 哈希存储。

---

## 六、启动后端

### 方式 A：systemd（推荐）

```ini
# /etc/systemd/system/lab-match-backend.service
[Unit]
Description=Lab Match Backend
After=network.target mysql.service

[Service]
Type=simple
User=labmatch
WorkingDirectory=/opt/lab_match/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node app.js
Restart=always
RestartSec=5
StandardOutput=append:/var/log/lab-match/backend.log
StandardError=append:/var/log/lab-match/backend.err.log

[Install]
WantedBy=multi-user.target
```

```bash
sudo mkdir -p /var/log/lab-match && sudo chown labmatch /var/log/lab-match
sudo systemctl daemon-reload
sudo systemctl enable --now lab-match-backend
sudo systemctl status lab-match-backend
```

> 不要用 `npm run dev`（`node --watch`）作为生产启动方式；它会在文件变动时重启并可能与旧进程争抢端口。

### 方式 B：PM2

```bash
npm i -g pm2
cd /opt/lab_match/backend
pm2 start app.js --name lab-match-backend
pm2 save && pm2 startup
```

### 健康检查

```bash
curl -s http://127.0.0.1:8080/api/health
# {"code":"OK","message":"ok","data":{"status":"UP","storage":"mysql","time":"..."}}
```

`data.storage` 应与 `DB_DRIVER` 一致。

---

## 七、构建并托管前端

```bash
cd /opt/lab_match/frontend
npm run build          # 含 vue-tsc 类型检查 + vite 生产构建，产物在 dist/
```

构建产物为纯静态文件，由 Nginx 托管，并把 `/api`、`/uploads` 反向代理到后端。

```nginx
# /etc/nginx/conf.d/lab-match.conf
server {
    listen 443 ssl http2;
    server_name lab.example.edu.cn;

    ssl_certificate     /etc/ssl/certs/lab.example.edu.cn.pem;
    ssl_certificate_key /etc/ssl/private/lab.example.edu.cn.key;

    root /opt/lab_match/frontend/dist;
    index index.html;

    # 前端路由（history 模式）回退
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 接口转发
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;   # 大文件上传与录像查询需要更长超时
    }

    # 站内上传文件
    location /uploads/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
    }

    client_max_body_size 210m;     # 宣传资料单文件上限 200MB

    # 静态资源长缓存（文件名带 hash）
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

server {
    listen 80;
    server_name lab.example.edu.cn;
    return 301 https://$host$request_uri;
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

部署后确认 `backend/.env` 中 `CORS_ORIGIN=https://lab.example.edu.cn` 且 `TRUST_PROXY=1`。

---

## 八、配置 LiveKit（线上面试）

在 LiveKit Cloud 项目页面取得 URL、API Key、API Secret，写入 `backend/.env`：

```ini
LIVEKIT_URL=wss://<项目>.livekit.cloud
LIVEKIT_API_KEY=<key>
LIVEKIT_API_SECRET=<secret>
```

Webhook 需要公网可达，指向：

```
https://lab.example.edu.cn/api/livekit/webhook
```

若 Cloud 的 Webhook 签名密钥与房间 API 不同，另填 `LIVEKIT_WEBHOOK_API_KEY` / `LIVEKIT_WEBHOOK_API_SECRET`。

自检：

```bash
curl -s http://127.0.0.1:8080/api/health   # 服务正常
# 用学院账号登录后进入任一面试详情，确认可获取短期令牌
```

> 未配置 LiveKit 时，面试排期、评分、档案等业务仍可运行，仅"进入会议"不可用。

---

## 九、配置对象存储与录制（可选）

```ini
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_FORCE_PATH_STYLE=false

RECORDING_POLICY_VERSION=
RECORDING_NOTICE=
RECORDING_RETENTION_DAYS=
RECORDING_COLLEGE_VIEW_IDS=
RECORDING_DOWNLOAD_IDS=
RECORDING_MANAGE_IDS=
```

- 桶应设为**私有**，播放通过后端签发的短期地址进行。
- `RECORDING_POLICY_VERSION` 等告知类配置未填写时，系统不开启录制。
- 录像保留天数由 `RECORDING_RETENTION_DAYS` 控制，到期由后台任务清理。

---

## 十、配置 AI 纪要（可选）

```ini
INTERVIEW_AI_POLICY_VERSION=
INTERVIEW_AI_NOTICE=
INTERVIEW_STT_URL=
INTERVIEW_STT_MODEL=Systran/faster-whisper-large-v3
INTERVIEW_STT_API_KEY=
INTERVIEW_FFMPEG=ffmpeg
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-flash
INTERVIEW_AI_COLLEGE_VIEW_IDS=
```

- 服务器需预装 `ffmpeg`（用于音轨抽取），否则逐字稿任务会失败。
- 未配置 `DEEPSEEK_API_KEY` 时 AI 纪要不开启，教师仍可正常评分。
- AI 结果只作为教师回顾的辅助材料，不参与任何自动录取判断。

---

## 十一、数据备份与恢复

### JSON 文件存储

```bash
# 备份（文件写入是串行化的，短暂停写不会损坏数据）
tar -czf /backup/lab-match-$(date +%F).tar.gz \
  -C /opt/lab_match/backend data/.store.json data/private-resumes data/briefing-files data/promotion-files uploads
```

恢复：停止后端 → 解压覆盖对应目录 → 启动后端 → 访问 `/api/health` 与任一列表页确认。

### MySQL

```bash
mysqldump -u lab_match -p --single-transaction --routines lab_match > /backup/lab_match-$(date +%F).sql
mysql -u lab_match -p lab_match < /backup/lab_match-2026-11-17.sql
```

文件类数据（录像、简历、宣讲材料）仍需按上面的目录单独备份。

建议用 cron 每日执行，并保留最近 14 天。

---

## 十二、上线自检清单

| # | 检查项 | 命令 / 方式 | 期望 |
| --- | --- | --- | --- |
| 1 | 健康检查 | `curl /api/health` | `status: UP`，`storage` 正确 |
| 2 | 存储类型 | 同上 | 与 `DB_DRIVER` 一致 |
| 3 | 数据库迁移 | `node database/verify.js` | 全部 PASS |
| 4 | 账号可用 | 学院负责人登录 | 进入工作台，首次登录要求改密 |
| 5 | 前端构建产物 | 访问站点根路径 | 正常渲染登录页，无 404 资源 |
| 6 | 接口连通 | 登录后刷新任一列表 | 数据正常返回 |
| 7 | HTTPS | 浏览器地址栏 | 证书有效，HTTP 自动跳转 |
| 8 | 上传 | 上传一张图片 | 返回 `/uploads/...` 且可访问 |
| 9 | 限流 | 连续 11 次错误密码 | 第 11 次起返回 429 |
| 10 | LiveKit | 进入面试会议（需真人与设备） | 可开麦开摄像头 |
| 11 | 备份 | 手动执行一次备份 | 文件生成且大小合理 |

---

## 十三、常见故障排查

| 现象 | 可能原因 | 处理 |
| --- | --- | --- |
| 启动报 `EADDRINUSE` | 旧进程仍占用端口 | `ss -lntp \| grep 8080` 找到 PID 后 `kill`，再启动 |
| 启动报 `缺少数据表 xxx` | MySQL 未初始化或迁移未执行 | `npm run db:init` |
| 登录后立刻掉线 | `JWT_SECRET` 被更换或账号被停用/改密 | 确认 `.env` 未变；账号状态见 `npm run accounts:report` |
| 前端接口 502 | 后端未启动或 Nginx 代理地址错误 | 查 `systemctl status`，核对 `proxy_pass` 端口 |
| 前端静态资源 404 | `dist` 路径不对或未重新构建 | 重新 `npm run build`，核对 Nginx `root` |
| 页面刷新 404 | 未配置 history 回退 | 补 `try_files $uri $uri/ /index.html` |
| 上传 413 | Nginx 请求体上限过小 | 调大 `client_max_body_size` |
| 无法进入会议 | LiveKit 未配置或 Webhook 不可达 | 核对 `LIVEKIT_*`，公网访问 `/api/livekit/webhook` 应返回 401/400 而非 404 |
| 逐字稿一直失败 | `ffmpeg` 缺失或 STT 地址不可达 | `ffmpeg -version` 自检，核对 `INTERVIEW_STT_URL` |
| 频繁 429 | 反向代理未传真实 IP 导致全站共用计数 | 设置 `TRUST_PROXY=1` 并确认 Nginx 传 `X-Forwarded-For` |
| 阶段状态与预期不符 | 服务器时间与时区不对 | 校准 NTP；后端一律用服务器时间推导阶段 |

---

## 十四、生产环境注意事项

1. **HTTPS 必须开启**：面试需要摄像头与麦克风，浏览器仅在安全上下文（HTTPS 或 localhost）下授权设备。
2. **`JWT_SECRET` 必须替换**：默认值为空时令牌不安全。
3. **不要在公网暴露 8080**：只经由 Nginx 反代。
4. **`.env` 权限设为 600**，且不进入版本库。
5. **密钥轮换**：一旦怀疑泄漏（例如曾提交到仓库），立即在服务商侧轮换，并同步更新 `.env` 后重启。删除文件不等于风险消除，历史提交仍可被检出。
6. **单实例限制**：JSON 文件存储不支持多实例并发写；需要多实例时切 MySQL。
7. **录像与逐字稿属个人敏感信息**：访问控制由后端鉴权与审计日志保证，不要额外开放静态目录。
