# 面试录制与档案

教师、组长和学院负责人进入「面试录像与档案」，按学生、批次或实训室查询。档案关联原面试、志愿、聊天、参会连接、业务日志和已有评分。学生继续在「我的面试」查看本人安排，录制告知与授权在会议页单独处理。

## 配置和迁移

1. 保留第一阶段的 LiveKit Cloud 配置，确认 Cloud 项目能够调用 Egress。继续使用第二阶段的签名 Webhook 地址 `POST /api/livekit/webhook`，其中包括 Egress 开始、更新、结束事件。后台也会查询 Egress 任务补齐状态。 [LiveKit Egress API](https://docs.livekit.io/reference/other/egress/api/)
2. 在后端 `.env` 配置 `S3_REGION`、`S3_BUCKET`、`S3_ACCESS_KEY_ID`、`S3_SECRET_ACCESS_KEY`。兼容 S3 服务还需填写 HTTPS `S3_ENDPOINT`，按服务要求设置 `S3_FORCE_PATH_STYLE`。桶保持私有，配置允许 Cloud Egress 写入。应用凭证至少需要目标 `interviews/` 前缀的 `PutObject`（含所需分段上传权限）、`GetObject`、`DeleteObject`。如可划分凭证，应按实际部署分开限制上传和管理权限。版本化桶和对象锁需单独制定底层版本清理策略。当前删除使用 S3 DeleteObject；启用版本化时需核对历史版本生命周期。 [AWS S3 JavaScript SDK](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrate-s3.html)
3. 录制启用前设置学校批准的 `RECORDING_POLICY_VERSION`、`RECORDING_NOTICE` 和 `RECORDING_RETENTION_DAYS`。告知应包含录制目的、音视频和共享内容、使用范围、访问人员、保留期限、撤回方式和个人信息处理说明。有强制录制要求时，由学院确定规则和替代安排。
4. 学院负责人默认可查档案。分别用 `RECORDING_COLLEGE_VIEW_IDS`、`RECORDING_DOWNLOAD_IDS`、`RECORDING_MANAGE_IDS` 指定允许播放、下载和管理保留/删除的学院账号数字 ID。三项可以独立授权。主持人、受邀面试官以及本室组长可回放权限范围内的档案。
5. 使用 MySQL 时先备份，在 `backend` 运行 `npm install`、`npm run db:init`、`npm run db:check` 后重启。`migration_v9.sql` 仅新增 `interview_recordings` 和 `interview_recording_consents`，以外键关联面试和账号。JSON 存储自动补齐集合。录像二进制保存在对象存储，数据库仅保存任务、对象键、状态、大小、时长和日期等元数据。

## 录制、回放和删除

主持人可在开会前启用录制，使入会页面展示冻结的告知版本。会议开启后，系统等待主持人、学生及本场所有已领凭证的用户明确同意，并由 LiveKit 核对主持人和学生已连接，才提交一个 Room Composite Egress。主播布局输出 MP4。生效期间新领凭证的人员须先同意。参会者可拒绝或撤回，撤回已生效的同意会提交停止请求。会议结束也会触发停止与状态同步。

LiveKit 报告录制完成后，后台检查对象存在、长度与 MP4 文件头，再开放播放。启动响应不确定时，后台按房间与唯一对象键核对已有任务。同一场次仅提交一个录制计划。失败原因、审批、启停、签发和删除均写入已有操作日志。下载日志记录授权与地址签发结果，实际传输由对象存储负责。播放地址有效期 5 分钟，支持 Range；地址过期时可刷新链接并恢复进度。

获授权的学院账号可为争议保存设置或解除保留，也可请求删除。到期清理跳过留置录像。删除队列可在重启后恢复，仅处理对象和录像状态，保留面试及评分记录。

## API

| 方法与路径 | 用途 |
| --- | --- |
| GET `/api/interview-video/archives` | 按学生、批次、实训室检索有权限的档案 |
| GET `/api/interview-video/:id/archive` | 档案详情，可按消息 ID 读取下一页聊天 |
| GET `/api/interview-video/:id/state` | 会议角色可读取录制状态、本人的决定和告知 |
| POST `/api/interview-video/:id/recording/enable` | 主持人启用本场录制计划 |
| POST `/api/interview-video/:id/recording/consent` | 独立提交同意或拒绝，包含告知版本 |
| POST `/api/interview-video/:id/recording/stop` | 主持人停止录制或取消待授权计划 |
| POST `/api/interview-video/:id/recording/link` | 校验角色和录像状态，签发短期播放或下载地址 |
| POST `/api/interview-video/:id/recording/retention` | 有权限的学院账号提交保留、解除或删除 |

## 人工验收

1. 使用三个授权测试账号和空的私有测试桶。主持人开启录制计划后，先由一名参会者拒绝，确认后台和 Cloud Egress 此时没有创建任务。
2. 所有入场人员同意后入会，确认状态从启动中变为正在录制，切换屏幕共享并测试包含声音的三人画面。追加一名已受邀的面试官，确认继续录制时其入会必须独立确认。
3. 停止或结束会议，确认对象成功写入、进入档案并可播放、拖动、倍速、全屏。过期后刷新地址，验证续播。以非授权师生和其他实训室角色测试拒绝访问。
4. 核对参加、退出、重连、操作日志和聊天。启用争议保留后验证到期清理跳过录像。解除后在测试环境删除，并确认档案、聊天和评价仍可查阅。

真实录制、上传、回放和签名链接到期验收依赖实际私有桶及学校授权。录制授权与供应商状态的隔离测试不会产生真实录像。

在 `backend` 运行 `npm run test:recording`，可复查授权、关联场次、重复和乱序回调、处理中的录像拒绝签发、五分钟签名参数、下载审计及争议保留。签名测试使用隔离元数据验证权限和 URL，实际过期拒绝由配置完成后的对象存储验收确认。

## 第四阶段准备

已保存场次和 Egress 关联、录制元信息、访问方式、`transcription_state`、`summary_task_id`，档案有 AI 总结页签。后续可由后台任务读取授权的 MP4 音轨用于转写。若要保留逐人音轨，需另外确定授权与存储策略。

## 变更文件

- 后端服务和接口 `backend/services/interviewRecording.js`、`backend/routes/interviewArchive.js`、`backend/routes/interviewVideo.js`、`backend/routes/interviewWorkspace.js`、`backend/services/interviewWebhook.js`、`backend/app.js`。
- 存储和依赖 `database/migration_v9.sql`、`backend/data/mysql.js`、`backend/data/seed.js`、`backend/package.json`、`backend/package-lock.json`、`backend/.env.example`。
- 界面与 API `frontend/src/views/common/InterviewArchives.vue`、`frontend/src/views/common/InterviewMeeting.vue`、`frontend/src/api/interviewVideo.ts`、`frontend/src/router/index.ts`、`frontend/src/router/menus.ts`。
- 验收与说明 `backend/tests/interview-recording.js`、`README.md`、`docs/INTERVIEW_RECORDINGS.md`。
