# 面试 AI 纪要与教师审核

在「面试录像与档案 → AI 会议纪要」查看进度和版本。录制完成且私有录像校验通过后，后台检查录制授权和单独的 AI 授权。主持人、学生与所有已领取本场入会凭证的人员都同意后，系统按录像创建一个持久任务。拒绝不影响面试。撤回后停止后续发送和结果保存，已经提交的请求需按处理方条款处理。

## 配置与迁移

1. 先按[面试录制与档案](INTERVIEW_RECORDINGS.md)配置私有 S3、签名 Webhook 和学校录制告知。确认已产生可播放的录像。部署 FFmpeg，并把可执行文件加入服务进程的 PATH，或填写 `INTERVIEW_FFMPEG`。
2. 在学校批准的网段部署 Speaches，加载中文多语言模型 `Systran/faster-whisper-large-v3`。将 `INTERVIEW_STT_URL` 指向该服务完整的 `/v1/audio/transcriptions` 接口，设置 `INTERVIEW_STT_MODEL` 和需要时的 `INTERVIEW_STT_API_KEY`。同机开发可使用 HTTP loopback，其余地址使用 HTTPS。此方案可把语音识别部署在校方控制的区域，支持中文和片段时间戳，推理成本及延迟由硬件决定。 [Speaches 语音识别](https://speaches.ai/usage/speech-to-text/)
3. 后端填写 `DEEPSEEK_API_KEY` 和 `DEEPSEEK_MODEL`（默认 `deepseek-flash`）。后端调用官方 Chat Completions JSON 模式，只提交经授权的逐字稿文本及段落编号。档案头部的学生、实验室、面试时间、面试官与持续时间来自业务数据。 [DeepSeek JSON 模式](https://api-docs.deepseek.com/guides/json_mode/)
4. 将校方批准的目的、处理方、部署区域、访问范围、保留期限和撤回方式填入 `INTERVIEW_AI_NOTICE`，并配置 `INTERVIEW_AI_POLICY_VERSION`。学院可用 `INTERVIEW_AI_COLLEGE_VIEW_IDS` 授权正式纪要查阅，下载和删除还须具备各自的录像管理名单权限。须核对账号适用的开放平台协议、业务数据用途及保留约定。公开政策对账号个人信息和 API 客户业务数据作了区分，并说明了 API 数据可能用于训练或改进的条件。 [DeepSeek 开放平台隐私政策](https://cdn.deepseek.com/policies/zh-CN/deepseek-open-platform-privacy-policy.html)
5. MySQL 部署先备份，然后在 `backend` 运行 `npm run db:init` 和 `npm run db:check`。[`migration_v11.sql`](../database/migration_v11.sql) 新增任务、AI 授权和不可覆盖的版本表。JSON 模式启动时补齐集合。生产使用现有单实例后端和持久数据源。任务表保存断点，已有断点的分段在重启和重试时复用。服务在外部请求返回前崩溃时，该段可能重新调用一次。同一录像仍只有一项任务。

## 转写、审核与权限

- 后端读取私有录像，用 FFmpeg 提取单声道音频，约每五分钟分段。每段识别时间以实际音频分段的起点转换到录像时间，静音或识别内容不足时显示具体失败原因。源文件上限 4 GiB，音轨上限四小时。临时媒体存放在后端系统临时目录，正常结束时清理。应让服务账号和备份策略保护临时文件。
- 现有录制保存混合音轨。Speaches 生成的段落不自动绑定学生或教师，教师可从录像确认发言人。原始逐字稿与每次修订独立保留。纪要整理主题、问答、项目、待核实事项及客观总结，超长逐字稿分块生成并汇总，后端验证引用属于输入段落。
- 在逐字稿或纪要的时间戳旁点击时间可跳到录像。主持教师修订逐字稿、保存纪要草稿并确认正式版本。已确认版本可复查，后续变更会形成新版本。受邀面试官可读取原稿和历史，组长及授权学院账号可读取正式纪要，学生可提交自己的 AI 授权。正式版本审核与既有评分、录取流程独立。
- 查看、导出、修订、确认及删除记录操作人和版本。录像到期或进入删除流程时清理 AI 正文，争议保留期间按原权限保留。获授权的学院负责人可在保留期内删除 AI 内容。删除只影响本系统 AI 资料，外部服务的删除按对应条款办理。

## API

| 接口 | 作用 |
| --- | --- |
| `GET /api/interview-video/:id/state` | 在会议页读取本人适用的 AI 告知和授权状态 |
| `POST /api/interview-video/:id/ai/consent` | 提交或撤回本人独立授权 |
| `GET /api/interview-video/:id/ai/status` | 查看权限内的任务进度和可用操作 |
| `POST /api/interview-video/:id/ai/read` | 经鉴权及审计读取当前或历史版本，可请求导出 |
| `POST /api/interview-video/:id/ai/action` | 启动或重试、修订逐字稿、保存草稿、确认正式版或删除 |

## 验收与第五阶段

运行 `npm run test:interview-ai` 验证独立授权、隔离适配器失败和断点、读写权限、引文、审核版本与删除。设置 `INTERVIEW_AI_TEST_FFMPEG` 可加测合成音频的真正 FFmpeg 分段、时间戳和静音判定。测试不会把模拟逐字稿或纪要写入生产档案。

真人验收使用经学校批准的测试账号和录音。先确认拒绝授权时任务不会启动，再由所有参会者同意并完成中文面试。比对录像、时码、普通话识别、发言人修订、DeepSeek 引用、审核版本和会后权限。然后验证网络超时和删除流程。私有 S3、授权说明、可用 STT 和真实 DeepSeek 密钥都是这项验收的前提。

第五阶段应从场次 ID 和已审核版本 ID 读取正式纪要，并沿用权限审计。录取状态继续由现有选拔流程管理。

## 变更文件

- 后端 `backend/services/interviewAi.js`、`backend/services/interviewAiProviders.js`、`backend/routes/interviewAi.js`、`backend/routes/interviewVideo.js`、`backend/routes/interviewWorkspace.js`、`backend/routes/interviewArchive.js`、`backend/app.js`。
- 迁移与配置 `database/migration_v11.sql`、`backend/data/seed.js`、`backend/data/mysql.js`、`backend/.env.example`。
- 界面 `frontend/src/views/common/InterviewAiPanel.vue`、`InterviewArchives.vue`、`InterviewMeeting.vue`、`frontend/src/api/interviewAi.ts`、`interviewVideo.ts`。
- 测试与说明 `backend/tests/interview-ai.js`、`backend/package.json`、`README.md`、`docs/INTERVIEW_AI.md`。
