# 线上面试 · 第一阶段

教师在「面试管理 → 安排面试」选择「平台视频」并设置时间，可邀请同实训室教师。学生从「我的面试」查看站内邀请并测试设备。受邀同事从教师端的「共同面试邀请」进入。组长可旁听本室面试，学院负责人可从「面试进度管理」旁听全院面试。旁听账号可接收音视频，主持人为创建排期的教师。

预约和入会沿用当前批次的第四阶段，预约时段须完全处于阶段时间内。主持人可在预约前十分钟开启会议。应试学生先进入等候室，获批后可加入和重连。系统记录平台开启和结束时间，并在收到 Cloud 的主持人入会事件后校准实际开始时间。预约结束时提醒主持人。批次停止、面试阶段关闭或主持人结束会议时，平台停止签发令牌并关闭 Cloud 房间。面试结束后原有评分继续由所选导师填写。

## 配置

1. 在 LiveKit Cloud 控制台找到项目 WebSocket URL、API Key 和 API Secret。将它们分别写入 `backend/.env` 的 `LIVEKIT_URL`、`LIVEKIT_API_KEY`、`LIVEKIT_API_SECRET`。可参考 `backend/.env.example`。保留文件中的现有数据库和登录配置。
2. 在 `backend` 和 `frontend` 分别运行 `npm install`，再重启两端。生产环境以 HTTPS 提供 Lab Match，并允许浏览器连接 LiveKit Cloud。开发时可在 localhost 测试摄像头和麦克风。
3. 生产部署时使用强随机 `JWT_SECRET`。LiveKit 密钥只加载到后端进程，切勿设为 `VITE_*` 变量。`.gitignore` 已忽略实际的 `.env`。
4. 在 LiveKit Cloud 控制台登记 `https://你的项目域名/api/livekit/webhook`。反向代理需保留请求原文、`Content-Type` 和 `Authorization`。签名使用同一项目的 API Key/Secret，使用独立 Webhook 密钥时填写模板中的两项可选变量。公开端点收到真实事件后才会产生参会留痕。 [LiveKit Webhook 配置](https://docs.livekit.io/intro/basics/rooms-participants-tracks/webhooks-events/)

未配置 LiveKit 时，常规面试仍可使用，平台视频排期会提示管理员配置。

## 数据迁移

- JSON 模式在读取旧数据时补空的 `interviewParticipants` 集合。原面试照常读取；线上排期才写入会议字段和受邀人员。
- MySQL 模式先备份现有数据库，在 `backend` 按现有配置运行 `npm run db:init`、`npm run db:check`，再部署并重启。增量脚本 `database/migration_v7.sql` 为 `interviews` 增加房间标识、志愿关联、开始/结束和清理时间，并创建 `interview_participants` 保存主持人、应试学生和受邀面试官。原有面试和评分无需回填。
- `database/migration_v8.sql` 增加锁定时间和实际媒体开始时间，扩展参会关系中的等候申请、审批、举手、静音请求及移除信息。新增 `interview_messages`、`interview_attendance` 和 `interview_webhook_events`。消息以场次、发送者、客户端请求 ID 去重。每条正式连接按 Cloud 房间 SID 与参与者 SID 留痕，断网后原连接恢复仍属于同一条记录。Cloud 未提供断开原因时显示为未知。JSON 开发模式自动建立对应集合。
- 会议详情使用按场次鉴权的接口。LiveKit 令牌绑定单个随机房间与匿名参会标识，首次连接令牌最长有效 30 秒。后台在关闭时删除房间，并在令牌到期后复查清理。操作日志记录排期、开启和结束。

## 接口

| 接口 | 用途 |
| --- | --- |
| `POST /api/interviews/schedule` | 沿用面试排期。传 `mode: "LIVEKIT"` 并可附带同室教师账号 ID 数组 `panelIds`。 |
| `GET /api/interview-video/panel` | 教师查看同室可邀请的账号。 |
| `GET /api/interview-video` | 按登录身份返回当前批次可访问的线上面试。 |
| `GET /api/interview-video/:id` | 查看预约时段、会议状态及受邀人员。 |
| `POST /api/interview-video/:id/token` | 向符合入会条件的用户签发凭证。会议待开启时，只有主持人可传 `{ "start": true }` 开启会议。 |
| `POST /api/interview-video/:id/end` | 主持人结束会议，重复请求返回原结束状态。 |
| `GET /api/interview-video/:id/state?after=0` | 获取等候、锁定、举手及聊天增量，等待名单只给主持人。 |
| `POST /api/interview-video/:id/waiting`、`waiting/decision` | 学生申请或取消等候，主持人批准或拒绝。 |
| `POST /api/interview-video/:id/lock`、`moderate`、`hand` | 锁定、移除、请求静音及举手。 |
| `POST /api/interview-video/:id/messages` | 由已获入会权限的成员发送持久化消息。 |
| `GET /api/interview-video/:id/profile`、`profile/resume`、`attendance` | 主持人与受邀面试官查看本场资料、下载简历和查阅出席记录。 |
| `POST /api/livekit/webhook` | 接收 Cloud 签名事件，记录加入、断开及房间退出。 |

创建面试的教师主持会议。会议锁定时，已批准学生、受邀面试官及已领取凭证的旁听人员仍可加入或重连。主持人可拒绝申请，解锁后可继续批准。移出成员时记录操作者和原因，禁止新签发，并调用 Cloud 的显式撤销接口。Cloud 调用失败时后台重试。静音请求由参会者自行确认。 [LiveKit 令牌撤销](https://docs.livekit.io/frontends/reference/tokens-grants/#token-revocation)

聊天先入库，再通过 LiveKit 发送更新通知。浏览器按服务端消息 ID 补读，未收到通知时由 HTTP 轮询恢复。刷新和会后历史沿用同一套鉴权。

## 人工验收

1. 在测试批次打开第四阶段，准备一名已提交志愿且选中该导师的学生。在教师端预约有效时段，再用学生账号确认站内邀请、时间、实训室和入会入口。
2. 在两台设备或使用两个独立浏览器会话登录。学生分别测试摄像头预览和麦克风音量。主持人开启后，两端都应能看到对方的画面并听到声音。
3. 轮流关闭和开启麦克风、摄像头。使用桌面浏览器选择一个窗口共享，另一端应看到共享画面。撤销浏览器摄像头或麦克风权限后重试，确认页面提示授权方式。
4. 刷新学生页面后重新加入，确认设备默认关闭。在通话中短时断开其中一台的网络，恢复后确认自动重连，或按提示重新加入。
5. 用未受邀学生、同室未受邀教师和其他实训室教师打开会议链接，应被拒绝。主持人结束会议后，其他人退出，原链接展示已结束。
6. 用三个账号入会。测试等候室拒绝、重新申请、锁定、解锁和批准。测试举手排序、主持人静音请求和移出。查看对端消息、刷新后聊天历史及出席记录。使用第二台真实设备复核扬声器切换、屏幕选择及物理断网。

可重复运行 `npm run test:video` 来验证排期、邀请、权限、令牌和结束状态。脚本使用隔离数据和签名测试密钥，无需 Cloud 配置。

## 下一阶段

第三阶段可用场次 ID 关联 LiveKit 房间和 Egress 任务，沿用已验证的 Webhook 接收入口。参会连接、聊天、审批和主持操作已有独立时间记录，可作为归档时间线。录制接入前，由学院确定录制授权、访问范围、保留期限和删除规则，再设计对象存储及录制任务状态。后续转写和总结可按场次关联结果，由教师确认。

## 变更文件

| 范围 | 文件 |
| --- | --- |
| 后端入口与接口 | `backend/app.js`、`backend/routes/interviews.js`、`backend/routes/interviewVideo.js` |
| LiveKit 签发与关闭 | `backend/services/interviewVideo.js`、`backend/services/interviewVideoCleanup.js` |
| 存储与迁移 | `backend/data/seed.js`、`backend/data/mysql.js`、`database/migration_v7.sql` |
| 四端入口及会议界面 | `frontend/src/router/index.ts`、`frontend/src/router/menus.ts`、`frontend/src/views/teacher/TeacherInterviews.vue`、`frontend/src/views/student/StudentInterview.vue`、`frontend/src/views/college/CollegeInterviews.vue`、`frontend/src/views/common/OnlineInterviewList.vue`、`frontend/src/views/common/InterviewMeeting.vue`、`frontend/src/views/common/MeetingTrack.vue` |
| API 与类型 | `frontend/src/api/interviewVideo.ts`、`frontend/src/api/request.ts`、`frontend/src/api/lab.ts`、`frontend/src/api/student.ts` |
| 配置与依赖 | `backend/.env.example`、前后端 `package.json` 和 `package-lock.json` |
| 测试与说明 | `backend/tests/interview-video.js`、`README.md`、`docs/ONLINE_INTERVIEWS.md` |
| 第二阶段新增 | `backend/routes/interviewWorkspace.js`、`backend/services/interviewWebhook.js`、`database/migration_v8.sql`、`frontend/src/views/common/MeetingChat.vue` |
