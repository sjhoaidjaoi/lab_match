# API 契约 V0.1（教师端 / 组长端）

> 骨架阶段前端使用 `src/mock` 数据；后端 `services` 返回同构 Mock。字段一旦冻结，两侧同步修改。
> 统一响应：`{ code: 0, message: "ok", data: ... }`；分页：`data = { list, total, page, pageSize }`。
> 认证：`Authorization: Bearer <JWT>`；**实训室范围以 token 内 `laboratoryId` 为准**，前端传参仅用于展示。

## 0. 枚举

| 枚举 | 取值 |
|---|---|
| role | STUDENT / LAB_TEACHER / LAB_LEADER / COLLEGE_ADMIN |
| interview_status | PENDING / EVALUATED / ABSENT |
| recommendation | ADMIT / ALTERNATE / REJECT |
| admission_type | INTENDED（拟录取）/ ALTERNATE（递补） |
| confirm_status | PENDING / CONFIRMED / ABANDONED / RELEASED |
| adjustment_type | INTERNAL / CROSS_LAB / MANUAL_PLACEMENT |
| submission_status | DRAFT / REVIEWING / APPROVED / REJECTED |

## 1. 教师端

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/teacher/dashboard` | 工作台统计：报名数、名额、待面试、已面试、拟录取、已确认、剩余 |
| GET | `/api/teacher/applications?keyword=&obeyInternal=&page=&pageSize=` | 报名列表（含三志愿与两个调剂意愿） |
| GET | `/api/teacher/applications/:studentId` | 学生详情 |
| GET | `/api/teacher/interviews?status=` | 面试名单 |
| POST | `/api/teacher/interviews/schedules` | 新建面试安排（date/time/location/form/interviewerIds） |
| PUT | `/api/teacher/interviews/:id/evaluation` | 保存五维评分 + 评价 + 建议 |
| GET | `/api/teacher/admissions` | `{ intended: [], alternate: [] }` |
| PUT | `/api/teacher/admissions` | 保存名单（alternate 带 order_no） |
| POST | `/api/teacher/admissions/submit` | 提交锁定 |
| GET | `/api/teacher/confirmations/stats` | `{ quota, confirmed, pending, abandoned, vacancy }` |
| GET | `/api/teacher/final` | 本室最终名单 |

### 评价请求体

```json
{
  "attitude": 85, "logic": 82, "programming": 90,
  "timeCommitment": 88, "comprehensive": 84,
  "evaluation": "基础扎实，表达清晰",
  "recommendation": "ADMIT",
  "weights": { "attitude": 20, "logic": 20, "programming": 30, "timeCommitment": 15, "comprehensive": 15 }
}
```

`weights` 合计必须为 100；不传则按五维平均。
综合分只用于展示与排序参考，**不自动决定拟录取名单**。

校验：五维均为 60~100 整数；`evaluation` 非空；同一 (batch, student, lab, interviewer, round) 唯一。

## 2. 组长端（仅 LAB_LEADER）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/teacher/room/summary` | 本室汇总 |
| GET | `/api/teacher/room/teachers` | 教师维度进度 |
| GET | `/api/teacher/room/vacancies` | 空缺名额 |
| GET | `/api/teacher/room/adjustments/candidates` | 内部调剂候选池 |
| POST | `/api/teacher/room/adjustments` | 保存调剂方案 |
| POST | `/api/teacher/room/adjustments/submit` | 提交调剂结果 |
| GET | `/api/teacher/room/submission` | 提交审核状态 |
| POST | `/api/teacher/room/submission` | 提交学院审核 |

### 候选池规则（待学院确认项已标注）

```text
interview_status = EVALUATED
AND 未被 admission_intentions(CONFIRMED) 占用
AND student_batch_wishes.obey_internal_adjustment = 1
AND ( 可选开关 Q6：是否包含未填报本室的学生 )
```

### 调剂提交校验（后端必须再校验一次）

1. 调剂人数 ≤ 空缺名额；
2. 每条 `reason` 非空；
3. 学生 `obey_internal_adjustment = 1`；
4. 已正式录取学生不得进入调剂池；
5. 写 `operation_logs`。

### 截止与结算

- 确认截止：阶段 5 结束（2026-11-04 12:00）；
- 内部调剂/提交截止：阶段 6 结束（2026-11-05 17:00）；
- 到期后写接口返回 `409 STAGE_CLOSED`；
- 结算规则：单意向 → 自动 `CONFIRMED`；多意向未选 → `ABANDONED`，名额按递补顺位处理。

## 3. 错误码

| code | 含义 |
|---|---|
| 0 | 成功 |
| 401 | 未登录 / token 失效 |
| 403 | 越权（跨实训室或角色不足） |
| 409 | 名额冲突、名单已锁定 |
| 422 | 参数校验失败 |

## 4. 提交学院审核状态机（教师/组长端 ↔ 学院端）

```text
DRAFT（草稿，可编辑）
  │  POST /api/teacher/room/submission
  ▼
REVIEWING（待学院审核，本室只读）
  ├── 学院通过：POST /api/admin/submissions/:id/approve → APPROVED（进入公示）
  └── 学院退回：POST /api/admin/submissions/:id/reject  → REJECTED（恢复可编辑）
                                                          │
                            重新提交（同提交接口）──────────┘
```

### 请求

```http
POST /api/teacher/room/submission
Authorization: Bearer <JWT: LAB_LEADER>

{
  "checklist": ["allEvaluated", "quotaOk", "alternateOrdered", "adjustmentReason"]
}
```

### 响应

```json
{ "code": 0, "message": "ok", "data": { "status": "REVIEWING", "submittedAt": "2026-11-05 16:20" } }
```

### 状态查询

```http
GET /api/teacher/room/submission
→ { "status": "DRAFT|REVIEWING|APPROVED|REJECTED", "submittedAt": "", "reviewer": "学院教学办", "rejectReason": "" }
```

### 后端强制校验（前端禁用按钮不算数）

1. 当前状态必须为 `DRAFT` 或 `REJECTED`，否则返回 409；
2. `checklist` 四项齐全；
3. 拟录取人数 ≤ 名额；
4. 递补 `order_no` 连续无重复；
5. 每条内部调剂 `reason` 非空且学生已确认（按 Q7 结论）；
6. 写入 `operation_logs`，记录操作人、时间、前后状态。

### 锁定范围

`REVIEWING` 与 `APPROVED` 状态下，本室以下写接口统一返回 409：
`PUT /teacher/admissions`、`POST /teacher/admissions/submit`、
`POST /teacher/room/adjustments`、`POST /teacher/room/adjustments/submit`。

## 5. 名单增补与递补补位（骨架已实现，接口待接）

### 5.1 从面试结果加入名单

```http
POST /api/teacher/admissions/from-interview
{
  "target": "INTENDED | ALTERNATE",
  "studentIds": [1001, 1002]
}
→ { "added": 2, "skipped": 0 }
```

规则：仅接受 `interviews.status = EVALUATED` 的学生；已在拟录取或递补名单中的去重跳过；
加入拟录取后状态为 `PENDING`（待学生确认），加入递补后 `order_no` 续写。

### 5.2 学生确认 / 超时放弃

```http
POST /api/teacher/admissions/:studentId/confirm
→ { "status": "CONFIRMED" }

POST /api/teacher/admissions/:studentId/abandon
→ { "promoted": { "studentId": 1010, "orderNo": 1 } | null }
```

放弃规则：

1. 仅 `PENDING` 可放弃；
2. 放弃记录从当前名单移出并单独留档（用于统计与审计）；
3. 若递补名单非空，自动补入第 1 位，状态为 `PENDING`（仍需学生确认），其余顺位重排；
4. 无递补时，空缺名额增加并进入第六阶段内部调剂；
5. 真实实现中放弃由定时任务或学生端触发，不允许教师代操作。

### 5.3 提交快照（`POST /api/teacher/room/submission` 的请求体）

```json
{
  "labId": 1,
  "quota": 64,
  "counts": { "intended": 64, "alternate": 12, "adjustment": 8, "confirmed": 56, "vacancy": 8 },
  "intended": [{ "studentId": 1, "studentNumber": "20250170001", "realName": "张明", "total": 88, "confirmed": "CONFIRMED" }],
  "alternate": [{ "studentId": 80, "orderNo": 1, "studentNumber": "20250170080", "realName": "王雨桐", "total": 79 }],
  "adjustments": [{ "studentId": 120, "studentNumber": "20250170120", "realName": "李思远", "reason": "面试表现突出" }],
  "vacancyHandover": { "count": 0, "note": "本室无法填满的名额移交学院统筹" },
  "submittedAt": "2026-11-10 21:30"
}
```

后端必须重新校验名单与名额，不能信任前端快照。

### 5.4 阶段门禁

前端 `stage.canWrite(stageNo)` 仅为演示开关（默认不启用）。真实实现由后端在每个写接口校验
`recruitment_stages` 是否处于对应阶段，非法返回 `409 STAGE_CLOSED`。

## 6. 操作日志

```http
GET /api/teacher/room/logs?type=&page=&pageSize=
→ { "list": [{ "id": 1, "time": "2026-11-10 21:30:05", "operator": "王老师", "type": "ADMISSION_ADD", "message": "从面试结果加入拟录取 2 人", "target": "INTENDED" }], "total": 12 }
```

类型：`ADMISSION_ADD` / `ADMISSION_REMOVE` / `CONFIRM` / `ABANDON` / `ADJUSTMENT_SUBMIT` /
`ADJUSTMENT_CONFIRM` / `SUBMIT` / `REVIEW_APPROVE` / `REVIEW_REJECT` / `LAB_INFO`。

要求：日志由**后端**在对应写接口内写入 `operation_logs`，前端 `stores/logs.js` 仅为演示；
日志不可编辑、不可由前端补写，查询权限限本室教师与学院负责人。

## 7. 面试排期与评价归属

### 7.1 按学生排期

```http
POST /api/teacher/interviews/schedules
{
  "date": "2026-11-04",
  "time": "14:00",
  "durationMin": 20,
  "location": "实验楼 B202",
  "form": "线下",
  "interviewer": "王老师",
  "studentIds": [1001, 1002, 1003]
}
→ { "count": 3 }
```

校验：

1. `studentIds` 非空，学生必须属于本室且 `interview_status = PENDING`；
2. 同一面试官的时间区间 `[time, time + durationMin)` 与已有安排**有交集** → `409 SCHEDULE_CONFLICT`
   （不是简单比较“同一天同一时刻”，首尾相接不算冲突）；
3. 时间必须落在**该面试官的专属时段**内（6 室按时间梯度错开、教师平分本室时段）→ 否则 `409 OUT_OF_SLOT`；
4. 只更新被选中的学生，**不得**覆盖全室待评价学生；
5. 已评价 / 缺勤的学生不允许重排。

### 7.2 单人改期

```http
PUT /api/teacher/interviews/:id/schedule
{ "date": "...", "time": "...", "location": "...", "form": "...", "interviewer": "..." }
```

### 7.3 评价归属

`PUT /api/teacher/interviews/:id/evaluation` 必须校验：

- 当前登录用户 id = 该记录的 `interviewer_id`（**禁止用姓名比较**；组长、学院负责人默认只读）；
- 不满足返回 `403 NOT_INTERVIEWER`；
- 前端只做按钮禁用与只读提示，不能作为权限依据。

### 7.4 组长面试汇总

```http
GET /api/teacher/room/interviews?interviewer=&recommendation=&keyword=
→ { "list": [{ "studentId": 1, "realName": "张明", "interviewer": "王老师",
               "scores": { "attitude": 90, "logic": 88, "programming": 85, "timeCommitment": 92, "comprehensive": 89 },
               "total": 89, "recommendation": "ADMIT", "evaluation": "...", "status": "EVALUATED" }] }
```

## 8. 学生详情与简历

原需求只要求“学生个人基本信息及填报志愿”，简历为教师端评审需要新增的展示项。

```http
GET /api/teacher/applications/:studentId
→ {
    "student": { "id": 1, "studentNumber": "20250170001", "realName": "张明", "phone": "138...",
                 "obeyInternal": false, "obeyCollege": false },
    "preferences": [{ "labId": 1, "labName": "智能感知与机器人实训室" }],
    "resume": {
      "gender": "男", "major": "软件工程", "grade": "2025 级", "gpa": "3.1",
      "skills": ["Python", "Vue", "MySQL", "OpenCV"],
      "projects": [{ "name": "基于 YOLO 的目标检测课程设计", "role": "算法", "desc": "…", "tech": "Python / Vue" }],
      "selfIntro": "…",
      "attachments": [{ "id": 11, "name": "个人简历.pdf", "size": "220 KB" }]
    }
  }
```

附件：`GET /api/files/:id` 需鉴权；仅本室教师、组长、学院负责人可下载。
真实上传需学生端提供入口，并接入对象存储或本地文件目录；当前前端为 Mock 简历。

## 9. 学生端接口（占位，学生端负责人实现）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/student/preferences?batchId=` | 查询本人志愿与调剂意愿 |
| PUT | `/api/student/preferences` | 提交/修改志愿（≤3 个平行、截止后锁定） |
| POST | `/api/student/admissions/:studentId/confirm` | 确认拟录取意向 |
| POST | `/api/student/admissions/:studentId/abandon` | 超时/主动放弃，服务端负责释放名额与递补补位 |
| GET | `/api/student/result?batchId=` | 个人最终结果 |

> 教师端「录取确认」页的统计与明细依赖 confirm / abandon 的真实写入。

## 10. 学院端接口（占位，学院端负责人实现）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/admin/submissions?batchId=&status=` | 本室提交列表 |
| POST | `/api/admin/submissions/:id/approve` | 审核通过 |
| POST | `/api/admin/submissions/:id/reject` | 审核退回（需 reason） |
| PUT | `/api/admin/labs/:id/quota` | 调整名额（需 reason，写日志） |
| POST | `/api/admin/batches/:id/publish` | 发布公示 |

> 组长端「提交学院审核」的状态流转依赖 approve / reject；名额调整会影响教师端剩余名额。

## 11. 文件与附件

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/files` | multipart 上传，返回 `{ id, name, size, url }` |
| GET | `/api/files/:id` | 鉴权下载/预览，校验本室范围 |

> 教师端「学生简历 → 附件」目前为占位提示，接入后改为调用 `GET /api/files/:id`。

## 12. 认证与登录

```http
POST /api/auth/login
{ "username": "2025017001", "password": "******" }

→ 200
{
  "token": "<JWT>",
  "user": {
    "id": 1,
    "role": "LAB_LEADER",
    "realName": "王老师",
    "laboratoryId": 1,
    "laboratoryName": "智能感知与机器人实训室",
    "laboratories": [{ "id": 1, "name": "智能感知与机器人实训室" }]
  }
}
```

```http
GET /api/auth/me  (Bearer token)
→ { "id": 1, "role": "LAB_LEADER", "laboratoryId": 1, "laboratories": [...] }
```

JWT 必含：`sub`、`role`、`laboratoryId`、`laboratories[]`。
**前端传的 laboratoryId 只用于展示，服务端一律以 token 为准。**

## 13. 未实现接口约定

- 所有占位接口返回 `501`，响应体 `{ code: 501, message: "xxx 尚未实现，契约见 docs/API.md" }`；
- 禁止用空数组/空对象伪装已实现，否则前端无法区分“没有数据”和“没做”；
- 实现一个接口时，同步删除对应的 `todo(...)` 与本文档中的「占位」字样。

## 14. 联调自检

```bash
# 后端（无需数据库）
cd backend && npm run dev
curl http://localhost:3000/api/meta/enums     # 200
curl http://localhost:3000/api/auth/login     # 501（POST 才是登录）
curl http://localhost:3000/api/teacher/dashboard  # 401（未带 token）

# 前端
cd frontend && npm run build && npm run smoke
```

## 15. 通知

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/notifications?unread=1` | 当前用户通知列表 |
| POST | `/api/notifications/read` | `{ ids: [1,2] }` 标记已读 |

响应字段包含 `audience`：

```json
{ "id": 1, "type": "REVIEW_REJECT", "title": "学院退回",
  "audience": { "role": "LAB_LEADER", "labId": 1, "user": null },
  "link": "/teacher/room/submit", "read": false }
```

前端按 `role / labId / user` 过滤；组长专属链接不得下发给普通教师。
触发场景：学生确认 / 放弃、学院退回、调剂结果、阶段变更、复评、截止提醒。
表结构见 `database/schema_reserved.sql` 的 `notifications`。

## 16. 元数据与规则开关

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/meta/enums` | 全系统枚举（已可用） |
| GET | `/api/meta/stages` | 八阶段模板（已可用） |
| GET | `/api/meta/batches` | 批次列表与当前批次（契约已给） |
| GET | `/api/meta/config` | **Q6/Q7/Q8 规则开关 + 功能开关（已可用）** |

`config.rules` 字段：

```json
{
  "internalAdjustmentOnlyOwnApplicants": true,
  "requireStudentConfirmForAdjustment": true,
  "crossLabAdjustmentAllowsUnapplied": false,
  "allowEditPreferencesBeforeDeadline": true,
  "quotaAdjustmentNeedsApproval": true
}
```

前端改规则时只改后端返回值，页面按开关渲染，**不允许在页面里写死 Q6/Q7/Q8**。

## 17. 阶段门禁（后端已实现）

```http
GET /api/meta/stage
→ { "current": { "no": 6, "name": "分轮补录（内部调剂）", "start": "...", "end": "..." },
    "stages": [ ... ] }
```

写接口允许的阶段：

| 接口 | 允许阶段 |
|---|---|
| `POST /teacher/interviews/schedules` | 4 |
| `PUT /teacher/interviews/:id/evaluation` | 4 |
| `PUT /teacher/admissions`、`POST /teacher/admissions/submit` | 5 |
| `POST /teacher/room/adjustments`、`/submit`、`POST /teacher/room/submission` | 6 |

不满足时返回：

```json
{ "code": 4091, "message": "当前为第 5 阶段（拟录取与学生确认），该操作仅在阶段 6 开放", "data": { "currentStage": 5 } }
```

联调时可固定阶段：`DEMO_STAGE_NO=6 npm run dev`。
不设置时按真实时间计算；全部结束后会落到第 8 阶段（写接口关闭）。

> 前端按钮禁用只是体验，**服务端这道门禁才是唯一可信的**。


## 18. 多面试官复评

```http
POST /api/teacher/interviews/:interviewId/reviewers
{ "interviewerId": 4 }
→ { "id": 1234, "interviewStatus": "PENDING" }
```

规则：

- 同一学生可以有多个面试官记录；
- 同一 `interviewerId` 不能重复评价同一学生（`409 REVIEWER_EXISTS`）；
- 新增记录初始为 `PENDING`，需排期后录入评价；
- 组长汇总按 `studentId` 聚合，展示平均分与每位面试官明细。


## 19. 到期结算

```http
POST /api/teacher/confirmations/settle
{ "batchId": 1, "deadline": "2026-11-04 12:00" }
→ { "confirmed": 8, "abandoned": 0, "settledAt": "..." }
```

规则：

- 单意向 → 自动 `CONFIRMED`，学生不能拒绝；
- 多意向 → 按第一/第二/第三志愿顺序自动选一个，其余释放；
- **幂等**：同一 `deadline` 重复调用返回同一结果，不重复改名单；
- 服务端保存结算前快照（名单与人数），用于追溯。

## 20. 时间变更申请（组长 → 学院）

```http
POST /api/teacher/room/stage-change-requests
{ "stageNo": 6, "proposedStart": "2026-11-04 12:00", "proposedEnd": "2026-11-05 20:00", "reason": "…" }
→ { "id": 1, "status": "PENDING" }
```

- 组长端只能“申请”，**不能直接改时间**；
- 学院端审批后由后端修改 `recruitment_stages`；
- 对应学院端：`POST /api/admin/stage-change-requests/:id/approve|reject`。

## 21. 缺勤

```http
POST /api/teacher/interviews/:id/absent
→ { "status": "ABSENT", "excluded": true }
```

一次缺勤即除名：不可恢复、不能进入本室候选池、不能被加入拟录取/递补。
跨实训室情况由学院端处理，本室不感知。


## 22. 导出与移交

| 能力 | 规则 |
|---|---|
| 组长导出 | 本室全部 |
| 普通教师导出 | 仅本人面试过的学生；CSV 首行水印；手机号脱敏 |
| CSV 安全 | 以 `= + - @` 开头的单元格加 `'`，防公式注入 |
| 导出留痕 | 成功 `EXPORT`、失败 `EXPORT_FAILED` 写入操作日志 |
| 移交名额 | 提交时写 `vacancyHandover`；提交页可导出真实 CSV；独立记录保留最近 20 次 |

> 水印占 CSV 第一行；下游若按首行当表头，需要先跳过说明行（P1-11，可选）。
