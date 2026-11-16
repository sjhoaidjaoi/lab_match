# 接口文档

- Base URL：`http://localhost:8080/api`
- 请求头：
  - `Authorization: Bearer <token>`（登录后获取）
  - `X-Role: STUDENT | LAB_TEACHER | LAB_LEADER | COLLEGE_ADMIN`（可选；只能在本账号实际拥有的角色中选择，后端不会信任越权角色）
  - `Content-Type: application/json`
- 统一响应：

```json
{ "code": "SUCCESS", "message": "ok", "data": {} }
```

错误响应使用 HTTP 状态码 400/401/403/404/500，`code` 为 `VALIDATION_FAILED`、`UNAUTHORIZED`、`ROLE_FORBIDDEN`、`NOT_FOUND`、`BUSINESS_ERROR` 等。

- 演示账号（密码均为 `123456`）：`2022001`（学生）、`T1001`（实训室教师）、`L001`（实训室组长）、`admin`（学院总负责人）

## 1. 认证与个人信息

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/auth/login` | 公开 | 登录，返回 `token/user/roles/activeRole` |
| POST | `/auth/logout` | 登录 | 退出登录（前端清除 token） |
| GET | `/auth/me` | 登录 | 当前用户信息（含 `laboratoryId`、`email`） |
| PUT | `/auth/profile` | 登录 | 修改本人手机号 / 邮箱 |
| PUT | `/auth/password` | 登录 | 修改密码（校验原密码，新密码至少 6 位） |
| POST | `/auth/switch-role` | 登录 | 多角色账号切换当前角色 |
| GET | `/auth/users` | 登录 | 基础用户列表（用于选择联系人） |

## 2. 批次与阶段

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/batches/current` | 公开 | 当前批次、八阶段与当前阶段 |
| GET | `/batches` | 登录 | 批次列表 |
| POST | `/batches` | COLLEGE_ADMIN | 创建批次并初始化八阶段 |
| GET | `/batches/:id/stages` | 登录 | 批次阶段列表 |
| PUT | `/batches/:batchId/stages/:stageId` | COLLEGE_ADMIN | 修改阶段状态与起止时间 |

## 3. 实训室

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/laboratories` | 公开 | 启用的实训室列表 |
| GET | `/laboratories/all` | COLLEGE_ADMIN | 全部实训室（含停用、报名数） |
| GET | `/laboratories/:id` | 公开 | 实训室详情（含宣讲、视频、全景、导师团队 `teachers`） |
| POST | `/laboratories` | COLLEGE_ADMIN | 新增实训室 |
| PUT | `/laboratories/:id` | 本室 LAB_LEADER；COLLEGE_ADMIN | 组长维护本室资料、状态和招生总名额；学院仅提交 `leaderId` 协调绑定 |
| POST | `/laboratories/:id/vacancy-report` | 本室 LAB_LEADER | 上报剩余名额 |
| GET | `/laboratories/:id/teachers` | 公开 | 导师团队列表 |
| GET | `/laboratories/:id/teachers/manage` | 本室 LAB_LEADER | 查看本室全部导师（含停用） |
| POST | `/laboratories/:id/teachers` | 本室 LAB_LEADER | 新增导师并关联本室教师或组长账号 |
| PUT | `/laboratories/:id/teachers/:teacherId` | 本室 LAB_LEADER | 修改导师信息和名额 |
| DELETE | `/laboratories/:id/teachers/:teacherId` | 本室 LAB_LEADER | 移除导师；已有志愿记录的导师可停用 |
| GET/POST | `/users/labs/:labId/staff` | 本室 LAB_LEADER | 查看本室账号、新建教师 |
| PUT | `/users/labs/:labId/staff/:userId` | 本室 LAB_LEADER | 修改或停用本室普通教师账号 |
| POST | `/users/labs/:labId/staff/:userId/reset-password` | 本室 LAB_LEADER | 重置本室普通教师密码，下次登录强制修改 |

## 4. 宣讲、开放日与媒体

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/announcements` | 公开 | 已发布公告 |
| GET | `/announcements/all` | COLLEGE_ADMIN | 全部公告 |
| POST/PUT/DELETE | `/announcements`、`/announcements/:id` | COLLEGE_ADMIN | 公告增删改 |
| GET | `/open-days` | 公开 | 开放日安排 |
| POST/PUT/DELETE | `/open-days`、`/open-days/:id` | COLLEGE_ADMIN | 开放日维护 |
| GET | `/media/videos`、`/media/panoramas` | 公开 | 已发布视频/全景 |
| GET | `/media/labs/:labId/videos`、`/media/labs/:labId/panoramas` | 公开 | 按实训室查询 |
| GET | `/media/admin/videos`、`/media/admin/panoramas` | COLLEGE_ADMIN / 本室组长 | 查看媒体，支持 `labId` 筛选 |
| POST/PUT/DELETE | `/media/admin/videos`、`/media/admin/panoramas` | 本室组长 | 维护本室媒体资源 |
| DELETE | `/media/labs/:labId/materials/:id` | 本室组长 | 移除本室宣讲文档 |
| POST | `/media/upload` | COLLEGE_ADMIN / LAB_LEADER / LAB_TEACHER | 上传图片/视频/PDF（≤100MB，字段名 `file`），返回 `/uploads/<文件名>`，可直接作为媒体地址 |

上传示例：

```bash
curl -X POST http://localhost:8080/api/media/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@briefing.mp4"
```

```json
{ "code": "SUCCESS", "message": "ok", "data": {
  "url": "/uploads/1730000000000-ab12cd.mp4",
  "name": "briefing.mp4", "size": 1048576, "mime": "video/mp4"
} }
```

## 5. 学生志愿

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/preferences/submit` | STUDENT | 提交 1–3 个平行志愿；仅阶段三进行中且未截止；自动生成面试资格 |
| GET | `/preferences/my` | 登录 | 学生本人志愿 |
| GET | `/preferences/lab/:labId` | 教师身份、学院 | 教师仅查看选择本人的报名，组长须切换为教师身份 |
| GET | `/preferences/all` | COLLEGE_ADMIN | 全院报名明细 |
| GET | `/preferences/overview` | COLLEGE_ADMIN | 各室报名统计 |

## 6. 面试

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/interviews/schedule` | 教师身份 | 给选择自己为导师的学生安排或更新面试 |
| POST | `/interviews/:id/score` | 教师身份 | 给选择自己为导师的学生做五维评分和评价 |
| GET | `/interviews/lab/:labId` | 教师身份、学院 | 教师查询本人的面试；学院统筹查看各室面试 |
| GET | `/interviews/my` | STUDENT | 本人所有面试 |
| GET | `/interviews/all` | COLLEGE_ADMIN | 全院面试明细 |
| GET | `/interviews/overview` | COLLEGE_ADMIN | 面试进度统计 |

## 7. 拟录取与确认

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/recruitment-reviews/lab-students` | 本室组长 | 汇总全室报名、面试、邀请状态，按教师姓名拼音排列 |
| GET | `/recruitment-reviews/lab-candidates` | 本室组长 | 汇总导师已发邀请、已提交建议及组长本人面试通过记录 |
| GET/POST | `/admissions/teacher-invitations` | 教师身份 | 查看本人候选、邀请与名额，或向选择本人且面试通过的学生发送首轮邀请 |
| GET | `/admissions/teacher-members` | 教师身份 | 查看接受本人邀请或确认调剂至本导师的学生 |
| POST | `/recruitment-reviews/teacher` | 本室教师/组长 | 保存或提交本人所面试学生的拟录取、递补建议 |
| POST | `/recruitment-reviews/lab` | 本室组长 | 选择本室汇总名单并报送学院 |
| POST | `/admissions/:id/confirm` | 学生本人 | 确认/放弃；只允许一个确认结果；超时拒绝 |
| GET | `/admissions/my` | STUDENT | 本人拟录取意向 |
| GET | `/admissions/lab/:labId` | 本室教师/组长、学院 | 本室拟录取与确认状态 |
| GET | `/admissions/all` | COLLEGE_ADMIN | 全院明细 |
| GET | `/admissions/overview` | COLLEGE_ADMIN | 各室拟录取汇总 |
| POST | `/admissions/expire` | 本室组长 | 处理本室超时的意向和递补 |

## 8. 调剂

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/adjustments/internal` | 本室 LAB_LEADER | 内部调剂；来源与目标必须为本室 |
| POST | `/adjustments/cross` | COLLEGE_ADMIN | 单条跨实训室调剂 |
| POST | `/adjustments/cross-batch` | COLLEGE_ADMIN | 批量调剂方案（返回成功/失败明细） |
| POST | `/adjustments/placement` | COLLEGE_ADMIN | 未落实学生沟通安置 |
| GET | `/adjustments/list` | COLLEGE_ADMIN | 全院调剂明细（含学生/实训室/操作人） |
| PUT | `/adjustments/:id/status` | COLLEGE_ADMIN | 审核调剂结果 |
| POST | `/adjustments/:id/confirm` | 学生本人 | 确认/拒绝调剂 |
| GET | `/adjustments/my` | STUDENT | 本人调剂记录 |
| GET | `/adjustments/lab/:labId` | 本室教师/组长、学院 | 本室相关调剂 |
| GET | `/adjustments/overview` | COLLEGE_ADMIN | 调剂分类统计 |

调剂统一校验：已最终录取/已确认拟录取/已有确认调剂不得再进池；内部调剂需服从内部调剂，跨室需服从全院调剂；目标实训室名额按学生去重后校验。

## 9. 最终名单、公示与入组

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/final/merge` | COLLEGE_ADMIN | 汇总最终名单；超额直接拒绝；保留已入组状态 |
| GET | `/final/check` | COLLEGE_ADMIN | 名额与重复录取校验结果 |
| POST | `/final/review` | COLLEGE_ADMIN | 审核最终名单（APPROVED/REJECTED） |
| GET | `/final/list` | 学院；本室教师/组长 | 最终名单（角色范围内） |
| GET | `/final/my` | STUDENT | 本人最终结果 |
| POST | `/final/publicity` | COLLEGE_ADMIN | 发布公示；须审核通过且起止时间合法 |
| GET | `/final/publication` | 公开 | 当前公示 |
| POST | `/final/objections/student` | STUDENT | 公示期间提交异议 |
| GET | `/final/objections/my` | STUDENT | 本人异议 |
| GET | `/final/objections` | COLLEGE_ADMIN | 全部异议 |
| POST/PUT | `/final/objections`、`/final/objections/:id` | COLLEGE_ADMIN | 登记/处理异议 |
| POST | `/final/:id/enroll` | 学院；本室组长 | 单人正式入组（不可重复） |
| POST | `/final/enroll-all` | COLLEGE_ADMIN | 批量入组；入组前重新校验超额/重复 |

## 10. 统计

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/statistics/college` | COLLEGE_ADMIN | 全院总览 |
| GET | `/statistics/capacity` | COLLEGE_ADMIN | 各室名额与空缺 |
| GET | `/statistics/unplaced` | COLLEGE_ADMIN | 未落实学生 |
| GET | `/statistics/candidates` | COLLEGE_ADMIN | 全院调剂候选 |
| GET | `/statistics/lab/:labId` | 本室教师/组长、学院 | 本室工作台统计 |
| GET | `/statistics/lab/:labId/candidates` | 本室教师/组长、学院 | 本室调剂候选（面试分数、意愿、是否可调剂） |

## 11. 用户、通知、日志

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/users` | COLLEGE_ADMIN | 用户列表（支持 `keyword/laboratoryId/page/pageSize`；带 `page` 时返回 `{list,total,page,pageSize,totalPages}`） |
| GET | `/users/staff` | COLLEGE_ADMIN | 教师/组长列表 |
| POST | `/users` | COLLEGE_ADMIN | 新增用户 |
| POST | `/users/import` | COLLEGE_ADMIN | 批量导入学生 |
| PUT | `/users/:id` | COLLEGE_ADMIN | 修改用户/绑定实训室 |
| POST | `/users/:id/reset-password` | COLLEGE_ADMIN | 重置密码 |
| DELETE | `/users/:id` | COLLEGE_ADMIN | 停用用户 |
| GET | `/notifications/my` | 登录 | 本人/本角色通知 |
| POST | `/notifications/:id/read` | 登录 | 标记已读 |
| POST | `/notifications` | 学院/教师/组长 | 发通知；只有学院可全院群发 |
| GET | `/logs` | COLLEGE_ADMIN | 操作日志（支持 `keyword/operationType/page/pageSize`；带 `page` 时为分页对象） |

## 12. 健康检查

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/health` | 公开 | 服务健康状态，`data.storage` 为 `file` 或 `mysql` |
