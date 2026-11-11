# 04 API｜学生实训室进组选拔平台

> 版本：v1.0（阶段 1 定稿待确认）
> 字段名与状态值以 `03_Database.md` 为唯一基准，本文档不得自造枚举。

## 1. 全局约定

- 前缀：`/api/v1`
- 认证：`Authorization: Bearer <token>`；Token 失效或登出后进入 Redis 黑名单
- 统一响应：

```json
{ "code": 200, "message": "success", "data": {} }
```

- 分页参数：`pageNum`（从 1 开始）、`pageSize`（默认 10，上限 100）
- 分页响应：`{ "total": 0, "pageNum": 1, "pageSize": 10, "list": [] }`
- 幂等：所有写接口（含填报、确认、发放、抢录、直录、调整、锁定、快照）必须携带 `Idempotency-Key` 请求头（UUID），服务端缓存结果 24 小时，重复请求返回同一结果
- 时间格式：`yyyy-MM-dd HH:mm:ss`；日期 `yyyy-MM-dd`；时间 `HH:mm`
- 金额/分数：JSON 数字，保留两位小数，如 `85.50`；前端按 number 处理
- 脱敏规则（服务端统一处理）：学号 `2022****01`、姓名 `陈*丽`、手机号 `138****5678`；本人视图返回完整值

### 1.1 端侧前缀

| 端 | 前缀 | 鉴权角色 |
|---|---|---|
| 公共 | `/api/v1/public` | 免登录 |
| 认证 | `/api/v1/auth` | 免登录（login）/ 需登录（其余） |
| 学生端 | `/api/v1/student` | 学生 |
| 教师端 | `/api/v1/teacher` | 导师 |
| 负责人端 | `/api/v1/leader` | 实训室负责人 |
| 管理端 | `/api/v1/admin` | 学院管理员 |

### 1.2 错误码

| 错误码 | 含义 |
|---|---|
| 200 | 成功 |
| 400001 | 参数校验失败 |
| 400002 | 业务规则不满足 |
| 400003 | 超出个人名额上限 |
| 400004 | 不在有效时间窗内 |
| 400005 | 当前状态不允许该操作 |
| 401001 | 未登录或 Token 已失效 |
| 401002 | 账号或密码错误 |
| 401003 | 账号已被禁用 |
| 401004 | 需先修改初始密码 |
| 403001 | 无权访问该资源 |
| 404001 | 资源不存在 |
| 409001 | 重复提交或状态冲突 |
| 429001 | 请求过于频繁 |
| 500001 | 服务端异常 |

### 1.3 状态枚举

| 对象 | 字段 | 取值 |
|---|---|---|
| 选拔轮次 | selection_round.status | 1 未开始、2 填报中、3 面试中、4 拟录取确认中、5 已完成 |
| 面试场次 | interview_session.status | 1 草稿、2 已发布、3 已结束 |
| 面试排期 | interview_schedule.status | 1 待面试、2 已完成、3 缺席 |
| 面试评分 | interview_score.status | 0 未评分、1 草稿、2 已提交 |
| 拟录取汇总 | submitStatus | 0 未提交、1 待提交、2 已提交 |
| 题库题型 | question.question_type | 1 单选、2 多选、3 判断、4 填空 |
| 题库状态 | question.status | 1 启用、0 停用 |
| 在线试卷 | exam_paper.status | 1 草稿、2 已发布 |
| 在线答卷 | exam_answer.status | 0 未参加（列表派生）、1 答题中、2 已提交 |

## 2. 接口总览

### 2.1 认证

| 方法 | 路径 | 说明 | 鉴权 |
|---|---|---|---|
| POST | /api/v1/auth/login | 统一登录，`loginType` 区分学生/教师/管理员 | 否 |
| POST | /api/v1/auth/logout | 登出，Token 入黑名单 | 是 |
| POST | /api/v1/auth/refresh | 刷新 Token | 是 |
| POST | /api/v1/auth/change-password | 修改密码（首登强制改密走此接口） | 是 |

### 2.2 公共

| 方法 | 路径 | 说明 | 鉴权 |
|---|---|---|---|
| GET | /api/v1/public/labs | 实训室列表（分页、筛选） | 否 |
| GET | /api/v1/public/labs/{id} | 实训室详情 | 否 |
| GET | /api/v1/public/mentors/{id} | 导师详情 | 否 |
| GET | /api/v1/public/notices | 公告列表（分页） | 否 |
| GET | /api/v1/public/notices/{id} | 公告详情 | 否 |
| GET | /api/v1/public/rounds/current | 当前轮次与时间窗状态 | 否 |

### 2.3 学生端

| 方法 | 路径 | 说明 | 鉴权 |
|---|---|---|---|
| GET | /api/v1/student/profile | 个人信息 | 学生 |
| PUT | /api/v1/student/profile | 修改个人信息 | 学生 |
| GET | /api/v1/student/archive | 我的档案详情 | 学生 |
| PUT | /api/v1/student/archive | 保存档案（含个人陈述） | 学生 |
| GET | /api/v1/student/dashboard | 工作台聚合数据 | 学生 |
| GET | /api/v1/student/intention | 查询当前轮填报 | 学生 |
| POST | /api/v1/student/intention | 保存/提交填报 | 学生 |
| GET | /api/v1/student/mentors/available | 可选导师列表 | 学生 |
| GET | /api/v1/student/interviews | 我的面试安排 | 学生 |
| GET | /api/v1/student/exams | 我的在线笔试列表 | 学生 |
| GET | /api/v1/student/exams/{paperId} | 试卷与本人作答（不含答案） | 学生 |
| POST | /api/v1/student/exams/{paperId}/start | 开始答题 | 学生 |
| PUT | /api/v1/student/exams/{paperId}/answers | 暂存作答 | 学生 |
| POST | /api/v1/student/exams/{paperId}/submit | 交卷并自动判分 | 学生 |
| GET | /api/v1/student/confirm-center | 录取待确认中心（三场景统一） | 学生 |
| POST | /api/v1/student/confirm-center/{id}/respond | 待确认响应（接受/拒绝） | 学生 |
| GET | /api/v1/student/supplement/mentors | 补录可选导师（仅剩余名额） | 学生 |
| GET | /api/v1/student/publicity/{id} | 公示名单（本人完整、他人脱敏） | 学生 |
| POST | /api/v1/student/disputes | 提交异议工单 | 学生 |
| GET | /api/v1/student/disputes | 我的异议列表 | 学生 |
| GET | /api/v1/student/disputes/{id} | 异议详情 | 学生 |
| GET | /api/v1/student/notices | 我的通知列表 | 学生 |
| PUT | /api/v1/student/notices/read | 标记已读 | 学生 |
| GET | /api/v1/student/notices/unread-count | 未读数量 | 学生 |

### 2.4 教师端（导师）

| 方法 | 路径 | 说明 | 鉴权 |
|---|---|---|---|
| GET | /api/v1/teacher/profile | 导师个人信息 | 导师 |
| PUT | /api/v1/teacher/profile | 修改个人信息 | 导师 |
| GET | /api/v1/teacher/dashboard | 工作台聚合数据 | 导师 |
| GET | /api/v1/teacher/applicants | 报名学生列表 | 导师 |
| GET | /api/v1/teacher/students/{studentId}/archive | 查看本人意向学生档案 | 导师 |
| GET | /api/v1/teacher/questions | 本人题库列表 | 导师 |
| POST | /api/v1/teacher/questions | 新增题目 | 导师 |
| PUT | /api/v1/teacher/questions/{id} | 修改本人题目 | 导师 |
| DELETE | /api/v1/teacher/questions/{id} | 删除或停用本人题目 | 导师 |
| GET | /api/v1/teacher/exam-papers | 本人试卷列表 | 导师 |
| GET | /api/v1/teacher/exam-papers/{id} | 本人试卷详情 | 导师 |
| POST | /api/v1/teacher/exam-papers | 新建试卷草稿 | 导师 |
| PUT | /api/v1/teacher/exam-papers/{id} | 修改试卷草稿 | 导师 |
| DELETE | /api/v1/teacher/exam-papers/{id} | 删除试卷草稿 | 导师 |
| POST | /api/v1/teacher/exam-papers/{id}/publish | 发布试卷 | 导师 |
| GET | /api/v1/teacher/exam-papers/{id}/results | 参考与得分 | 导师 |
| GET | /api/v1/teacher/scores/{studentId} | 查看本人对某学生的评分 | 导师 |
| POST | /api/v1/teacher/scores | 录入/更新本人评分 | 导师 |
| POST | /api/v1/teacher/scores/import | Excel 批量导入本人评分 | 导师 |
| GET | /api/v1/teacher/nominations | 我的拟录取列表 | 导师 |
| POST | /api/v1/teacher/nominations | 保存/提交拟录取 | 导师 |
| GET | /api/v1/teacher/waitlist | 我的递补名单 | 导师 |
| PUT | /api/v1/teacher/waitlist/rank | 调整递补顺位 | 导师 |
| GET | /api/v1/teacher/admissions | 我的录取名单 | 导师 |
| POST | /api/v1/teacher/admissions/{id}/remind | 发送确认提醒 | 导师 |
| GET | /api/v1/teacher/reallocation-pool | 全院调剂池列表 | 导师 |
| POST | /api/v1/teacher/reallocation-pool/{studentId}/take | 抢录池内学生 | 导师 |
| POST | /api/v1/teacher/supplement/direct-admit | 补录直接录入（免面试） | 导师 |

### 2.5 负责人端

| 方法 | 路径 | 说明 | 鉴权 |
|---|---|---|---|
| GET | /api/v1/leader/dashboard | 本室工作台 | 负责人 |
| GET | /api/v1/leader/mentors | 本室导师与名额 | 负责人 |
| PUT | /api/v1/leader/mentors/{id}/quota | 调整导师名额 | 负责人 |
| GET | /api/v1/leader/interview-sessions | 场次列表 | 负责人 |
| POST | /api/v1/leader/interview-sessions | 新增场次 | 负责人 |
| PUT | /api/v1/leader/interview-sessions/{id} | 修改场次 | 负责人 |
| DELETE | /api/v1/leader/interview-sessions/{id} | 删除场次 | 负责人 |
| GET | /api/v1/leader/interview-schedules | 排期列表（学生+导师） | 负责人 |
| GET | /api/v1/leader/interview-schedules/unassigned | 待排学生+导师组合 | 负责人 |
| POST | /api/v1/leader/interview-schedules/assign | 拖拽排期（指定导师） | 负责人 |
| PUT | /api/v1/leader/interview-schedules/{id}/status | 登记面试状态 | 负责人 |
| POST | /api/v1/leader/interview-schedules/auto | 自动分配 | 负责人 |
| PUT | /api/v1/leader/interview-schedules | 手工调整排期 | 负责人 |
| POST | /api/v1/leader/interview-sessions/publish | 发布排期 | 负责人 |
| POST | /api/v1/leader/interview-sessions/publish/cancel | 取消并重排 | 负责人 |
| GET | /api/v1/leader/scores | 本室评分汇总（按学生+导师） | 负责人 |
| GET | /api/v1/leader/nominations | 本室拟录取汇总 | 负责人 |
| POST | /api/v1/leader/nominations/submit | 提交本室名单至学院 | 负责人 |
| GET | /api/v1/leader/nominations/{mentorId} | 查看导师拟录取名单 | 负责人 |
| PUT | /api/v1/leader/nominations/{mentorId} | 调整导师拟录取名单 | 负责人 |
| GET | /api/v1/leader/applicants | 本室报名学生列表 | 负责人 |
| GET | /api/v1/leader/students/{studentId}/archive | 本室报名学生档案 | 负责人 |
| GET | /api/v1/leader/reallocation/candidates | 本室内部调剂候选 | 负责人 |
| GET | /api/v1/leader/admissions | 本室录取确认汇总 | 负责人 |
| GET | /api/v1/leader/admissions/export | 导出本室最终名单 | 负责人 |
| GET | /api/v1/leader/waitlist | 本室递补名单 | 负责人 |
| PUT | /api/v1/leader/waitlist/rank | 调整本室递补顺位 | 负责人 |
| POST | /api/v1/leader/reallocation | 执行内部调剂 | 负责人 |

### 2.6 管理端

| 方法 | 路径 | 说明 | 鉴权 |
|---|---|---|---|
| GET | /api/v1/admin/dashboard | 全院工作台 | 管理员 |
| GET | /api/v1/admin/rounds | 轮次列表 | 管理员 |
| POST | /api/v1/admin/rounds | 新建轮次 | 管理员 |
| PUT | /api/v1/admin/rounds/{id} | 修改轮次与时间窗 | 管理员 |
| PUT | /api/v1/admin/rounds/{id}/status | 开启/结束轮次 | 管理员 |
| POST | /api/v1/admin/rounds/{id}/issue | 手动重跑批次签发（幂等） | 管理员 |
| GET | /api/v1/admin/labs | 实训室列表 | 管理员 |
| POST | /api/v1/admin/labs | 新建实训室 | 管理员 |
| PUT | /api/v1/admin/labs/{id} | 修改实训室 | 管理员 |
| DELETE | /api/v1/admin/labs/{id} | 删除实训室 | 管理员 |
| PUT | /api/v1/admin/labs/{id}/leader | 提拔负责人 | 管理员 |
| GET | /api/v1/admin/notices | 公告列表 | 管理员 |
| POST | /api/v1/admin/notices | 新建公告 | 管理员 |
| PUT | /api/v1/admin/notices/{id} | 编辑公告 | 管理员 |
| PUT | /api/v1/admin/notices/{id}/status | 发布/下线公告 | 管理员 |
| POST | /api/v1/admin/notices/upload | 公告附件上传（multipart） | 管理员 |
| DELETE | /api/v1/admin/notices/{id} | 删除公告（已发布需先下线） | 管理员 |
| GET | /api/v1/admin/students | 学生账号列表 | 管理员 |
| POST | /api/v1/admin/students | 新增学生账号 | 管理员 |
| PUT | /api/v1/admin/students/{id} | 编辑学生账号 | 管理员 |
| POST | /api/v1/admin/students/import | 批量导入学生 | 管理员 |
| POST | /api/v1/admin/students/{id}/reset-password | 重置学生密码 | 管理员 |
| PUT | /api/v1/admin/students/{id}/status | 启用/禁用学生 | 管理员 |
| GET | /api/v1/admin/mentors | 教师账号列表 | 管理员 |
| POST | /api/v1/admin/mentors | 新增教师账号 | 管理员 |
| PUT | /api/v1/admin/mentors/{id} | 编辑教师账号 | 管理员 |
| POST | /api/v1/admin/mentors/import | 批量导入教师 | 管理员 |
| POST | /api/v1/admin/mentors/{id}/reset-password | 重置教师密码 | 管理员 |
| PUT | /api/v1/admin/mentors/{id}/status | 启用/禁用教师 | 管理员 |
| GET | /api/v1/admin/quotas | 全院名额总览 | 管理员 |
| PUT | /api/v1/admin/mentors/{id}/quota | 强制调整导师名额（冻结期，留痕并公告） | 管理员 |
| POST | /api/v1/admin/admissions/{id}/adjust | 阶段内调整录取（确认/取消/改派） | 管理员 |
| POST | /api/v1/admin/rounds/{id}/snapshot | 生成轮次快照 | 管理员 |
| GET | /api/v1/admin/rounds/{id}/snapshots | 快照历史列表 | 管理员 |
| POST | /api/v1/admin/rounds/{id}/lock | 批次锁定 | 管理员 |
| POST | /api/v1/admin/rounds/{id}/unlock | 批次解锁（需密码二次验证） | 管理员 |
| GET | /api/v1/admin/quotas/export | 导出名额 Excel | 管理员 |
| GET | /api/v1/admin/reallocation/candidates | 三级调剂候选 | 管理员 |
| POST | /api/v1/admin/reallocation | 执行调剂（支持批量） | 管理员 |
| GET | /api/v1/admin/publicities | 公示批次列表 | 管理员 |
| GET | /api/v1/admin/publicities/{id}/rows | 公示名单明细 | 管理员 |
| POST | /api/v1/admin/publicities | 发起公示 | 管理员 |
| PUT | /api/v1/admin/publicities/{id}/end | 结束公示 | 管理员 |
| POST | /api/v1/admin/publicities/{id}/confirm | 确认最终名单 | 管理员 |
| GET | /api/v1/admin/disputes | 异议工单列表 | 管理员 |
| PUT | /api/v1/admin/disputes/{id}/handle | 处理异议 | 管理员 |
| GET | /api/v1/admin/results | 全院录取总览（归档后从 type=4 快照渲染） | 管理员 |
| GET | /api/v1/admin/results/export | 导出录取 Excel（归档后从 type=4 快照渲染） | 管理员 |

> 开放日信息（`lab.open_day_date / open_day_start_time / open_day_end_time / open_day_location / open_day_note`）的唯一维护入口为 `POST /api/v1/admin/labs` 与 `PUT /api/v1/admin/labs/{id}`；负责人端不提供开放日写接口，仅在公共实训室详情与实训室档案中只读展示。

## 3. 接口详述

### 3.1 登录 `POST /api/v1/auth/login`

- 鉴权：不需要
- 请求：

```json
{
  "loginType": "1, TINYINT, 登录端类型：1学生 2教师 3管理员, 必填",
  "userNo": "string, 学号/工号/管理员账号, 必填",
  "password": "string, 密码, 必填"
}
```

- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "expiresIn": 7200,
    "needChangePwd": 1,
    "user": {
      "id": 1001,
      "userNo": "20220001",
      "realName": "陈爱丽",
      "userType": 1,
      "leader": false,
      "college": "计算机学院",
      "major": "软件工程",
      "grade": "2022"
    }
  }
}
```

- 失败响应：

```json
{ "code": 401002, "message": "账号或密码错误" }
{ "code": 401003, "message": "账号已被禁用，请联系学院管理员" }
```

### 3.2 修改密码 `POST /api/v1/auth/change-password`

- 鉴权：需要
- 说明：`needChangePwd=1` 时后端只放行本接口与登出，其余业务接口返回 `401004`
- 请求：

```json
{
  "oldPassword": "string, 原密码, 必填",
  "newPassword": "string, 新密码，8-20位且含字母与数字, 必填",
  "confirmPassword": "string, 确认新密码, 必填"
}
```

- 成功响应：`{ "code": 200, "message": "success", "data": null }`
- 失败响应：

```json
{ "code": 400002, "message": "新密码不能与原密码相同" }
{ "code": 400001, "message": "两次输入的密码不一致" }
```

### 3.3 实训室列表 `GET /api/v1/public/labs`

- 鉴权：不需要
- 查询参数：`keyword`（可选）、`department`（可选，所属系部精确匹配）、`status`（可选，1 招录中 0 已满）、`pageNum`、`pageSize`
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 12,
    "pageNum": 1,
    "pageSize": 12,
    "list": [
      {
        "id": 1,
        "labCode": "LAB-AI-01",
        "labName": "人工智能实训室",
        "department": "信息工程学院",
        "leaderName": "王建国",
        "mentorCount": 5,
        "totalQuota": 20,
        "quotaUsed": 8,
        "remainQuota": 12,
        "researchDirection": "计算机视觉、大模型应用",
        "openDayDate": "2026-10-29",
        "status": 1
      }
    ]
  }
}
```

### 3.4 实训室详情 `GET /api/v1/public/labs/{id}`

- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "labCode": "LAB-AI-01",
    "labName": "人工智能实训室",
    "department": "信息工程学院",
    "leaderName": "王建国",
    "introduction": "面向 AI+PBL 项目实训的校级重点实训室",
    "researchDirection": "计算机视觉、大模型应用",
    "equipmentEnv": "GPU 服务器 8 台，算力 200T",
    "trainingPlan": "每期 16 周，每周投入不少于 10 小时",
    "assessmentRequirement": "中期答辩 + 结项验收",
    "openDayDate": "2026-10-29",
    "openDayStartTime": "14:00",
    "openDayEndTime": "17:00",
    "openDayLocation": "实验楼 A301",
    "openDayNote": "需携带学生证",
    "totalQuota": 20,
    "quotaUsed": 8,
    "remainQuota": 12,
    "status": 1,
    "mentors": [
      {
        "id": 11,
        "userId": 2001,
        "realName": "李海峰",
        "title": "副教授",
        "researchDirection": "多模态大模型",
        "quota": 4,
        "quotaUsed": 2,
        "remainQuota": 2
      }
    ]
  }
}
```

### 3.4.1 导师详情 `GET /api/v1/public/mentors/{id}`

- 鉴权：不需要
- 路径参数：`id` 为 `mentor_profile.id`
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 11,
    "userId": 2001,
    "realName": "李海峰",
    "title": "副教授",
    "labId": 1,
    "labName": "人工智能实训室",
    "researchDirection": "多模态大模型",
    "researchProjects": "面向教育场景的多模态问答系统",
    "quota": 4,
    "quotaUsed": 2,
    "remainQuota": 2
  }
}
```

- 失败响应：`{ "code": 404001, "message": "导师不存在" }`

### 3.4.2 公共公告 `GET /api/v1/public/notices`、`GET /api/v1/public/notices/{id}`

- 鉴权：不需要
- 查询参数（列表）：`noticeType`（可选）、`pageNum`、`pageSize`
- 成功响应（列表为分页结构，详情为单条）：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 501,
    "title": "第 1 轮拟录取名单公示",
    "noticeType": 3,
    "noticeTypeText": "公示",
    "content": "本轮拟录取名单已进入公示，公示截止时间：2026-11-06 08:00:00",
    "attachmentUrl": null,
    "publicityId": 1301,
    "publishTime": "2026-11-05 08:00:00"
  }
}
```

- 说明：`publicityId` 仅公示类公告（`noticeType = 3`）有值，前端据此跳转公示名单；其余类型为 `null`。

### 3.5 当前轮次 `GET /api/v1/public/rounds/current`

- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 2,
    "roundNo": 1,
    "roundName": "第一轮双选",
    "status": 2,
    "statusText": "填报中",
    "phase": "APPLY",
    "applyStart": "2026-11-02 08:00:00",
    "applyEnd": "2026-11-02 12:00:00",
    "interviewStart": "2026-11-02 12:00:00",
    "interviewEnd": "2026-11-03 17:00:00",
    "nominationStart": "2026-11-03 17:00:00",
    "nominationSubmitEnd": "2026-11-04 07:00:00",
    "confirmStart": "2026-11-04 08:00:00",
    "nominationEnd": "2026-11-04 12:00:00",
    "innerAdjustStart": "2026-11-04 14:00:00",
    "innerAdjustEnd": "2026-11-05 18:00:00",
    "adjustStart": "2026-11-06 08:00:00",
    "adjustEnd": "2026-11-06 12:00:00",
    "locked": 0,
    "serverTime": "2026-11-02 09:15:00",
    "countdownSeconds": 9900
  }
}
```

- `phase`：`APPLY` / `INTERVIEW` / `NOMINATION` / `CONFIRM` / `INNER_ADJUST` / `ADJUST` / `PUBLICITY` / `LOCKED` / `IDLE`，前端据此展示横幅与门禁
- `locked = 1` 时前端整站只读

### 3.5.1 个人信息 `GET /api/v1/student/profile`、`GET /api/v1/teacher/profile`

- 鉴权：学生 / 导师
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 900001,
    "userNo": "2022001",
    "realName": "陈丽",
    "userType": 1,
    "gender": 2,
    "phone": "13812345678",
    "email": "chenli@example.com",
    "college": "计算机学院",
    "major": "软件工程",
    "grade": "2022",
    "title": null
  }
}
```

- 说明：本人视图返回完整手机号与邮箱，不做脱敏；学生使用 `college / major / grade`，导师使用 `title`，其余字段为 `null`
- 修改个人信息 `PUT /api/v1/student/profile`、`PUT /api/v1/teacher/profile`
- 请求：

```json
{ "phone": "string, 手机号, 可选", "email": "string, 邮箱, 可选" }
```

- 说明：仅允许修改手机号与邮箱；手机号需匹配 `^1[3-9]\d{9}$`，邮箱需为合法邮箱格式，空字符串表示清空
- 成功响应：`{ "code": 200, "message": "success", "data": null }`

### 3.6 学生工作台 `GET /api/v1/student/dashboard`

- 鉴权：学生
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "round": { "roundNo": 1, "roundName": "第一轮双选", "status": 2, "statusText": "填报中", "countdownSeconds": 9900 },
    "todo": [
      { "type": "INTENTION", "text": "待填报意向", "count": 1, "target": "/student/intention" },
      { "type": "INTERVIEW", "text": "待参加面试", "count": 2, "target": "/student/interview" },
      { "type": "CONFIRM", "text": "待确认录取", "count": 1, "target": "/student/confirm-center" }
    ],
    "intentionSummary": {
      "status": 2,
      "items": [
        { "mentorId": 11, "mentorName": "李海峰", "labName": "人工智能实训室" }
      ],
      "acceptInnerAdjust": 1,
      "acceptCrossAdjust": 0
    },
    "unreadNoticeCount": 3
  }
}
```

### 3.7 查询填报 `GET /api/v1/student/intention`

- 鉴权：学生
- 查询参数：`roundId`（可选，默认当前轮）
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 501,
    "roundId": 2,
    "roundNo": 1,
    "status": 2,
    "statusText": "已提交",
    "acceptInnerAdjust": 1,
    "acceptCrossAdjust": 0,
    "submitTime": "2026-11-02 09:20:00",
    "editable": 1,
    "items": [
      {
        "mentorId": 11,
        "mentorName": "李海峰",
        "labId": 1,
        "labName": "人工智能实训室",
        "researchDirection": "多模态大模型",
        "remainQuota": 2
      }
    ]
  }
}
```

- 未填报时 `data` 为 `null`

### 3.8 保存/提交填报 `POST /api/v1/student/intention`

- 鉴权：学生
- 请求：

```json
{
  "roundId": "BIGINT, 轮次ID, 必填",
  "items": [
    { "mentorId": "BIGINT, 导师ID, 必填" }
  ],
  "acceptInnerAdjust": "TINYINT, 是否服从内部调剂 1是 0否, 必填",
  "acceptCrossAdjust": "TINYINT, 是否服从跨室调剂 1是 0否, 必填",
  "poolConsent": "TINYINT, 是否同意全院导师在调剂池查看完整档案 1是 0否, 必填",
  "submit": "TINYINT, 1提交 0存草稿, 必填"
}
```

- 成功响应：`{ "code": 200, "message": "success", "data": { "id": 501, "status": 2 } }`
- 失败响应：

```json
{ "code": 400001, "message": "至少选择 1 个意向" }
{ "code": 400002, "message": "首轮最多选择 3 个意向" }
{ "code": 400002, "message": "补录轮最多选择 1 个意向" }
{ "code": 400002, "message": "存在重复的导师意向" }
{ "code": 400002, "message": "档案必填项未完成：项目经历、个人陈述" }
{ "code": 400004, "message": "当前不在填报时间窗内" }
{ "code": 400005, "message": "填报已提交，不可重复提交" }
```

### 3.9 可选导师 `GET /api/v1/student/mentors/available`

- 鉴权：学生
- 查询参数：`keyword`、`labId`、`onlyAvailable`（1 仅显示有剩余名额）、`pageNum`、`pageSize`
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 36,
    "pageNum": 1,
    "pageSize": 10,
    "list": [
      {
        "mentorId": 11,
        "mentorName": "李海峰",
        "title": "副教授",
        "labId": 1,
        "labName": "人工智能实训室",
        "researchDirection": "多模态大模型",
        "quota": 4,
        "quotaUsed": 2,
        "remainQuota": 2,
        "selectable": 1
      }
    ]
  }
}
```

- `selectable=0` 时前端置灰并标注「已满」

### 3.10 我的面试安排 `GET /api/v1/student/interviews`

- 鉴权：学生
- 查询参数：`roundId`（可选）
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": 801,
      "roundNo": 1,
      "labId": 1,
      "labName": "人工智能实训室",
      "sessionName": "第一场",
      "interviewDate": "2026-11-02",
      "startTime": "14:00",
      "endTime": "15:30",
      "location": "实验楼 A301",
      "interviewers": ["李海峰", "王建国"],
      "note": "请提前 10 分钟到场",
      "status": 1,
      "statusText": "待面试"
    }
  ]
}
```

- `interviewers` 为面试官姓名，由 `interview_session_interviewer` 关联 `sys_user.real_name` 得出；场次未发布时不返回该场次。

> 原 §3.11 我的录取结果、§3.12 接受录取、§3.13 放弃录取（`/student/result*`）已移除，统一由 §3.41 录取待确认中心与 §3.42 待确认响应承载。

### 3.14 补录可选导师 `GET /api/v1/student/supplement/mentors`

- 鉴权：学生
- 说明：仅返回 `remainQuota > 0` 的导师，仅在补录轮次开放；已确认学生返回 403001
- 失败响应：`{ "code": 403001, "message": "你本轮已有录取去向，不可参与补录" }`
- 成功响应：结构同 `3.9`，`total` 与 `list` 仅含剩余名额导师

### 3.15 提交异议 `POST /api/v1/student/disputes`

- 鉴权：学生
- 请求：

```json
{
  "publicityId": "BIGINT, 公示批次ID, 必填",
  "disputeType": "TINYINT, 1录取结果有误 2名额分配不公 3信息登记错误 4其他, 必填",
  "content": "string, 异议说明, 必填, 最长500字",
  "attachments": ["string, 附件地址, 可选, 最多3个，地址合计不超过1000字符"]
}
```

- 成功响应：`{ "code": 200, "message": "success", "data": { "id": 1201, "status": 1 } }`
- 失败响应：

```json
{ "code": 400001, "message": "异议说明最长 500 字" }
{ "code": 400001, "message": "附件最多 3 个且地址合计不超过 1000 字符" }
{ "code": 400004, "message": "公示已结束，无法提交异议" }
{ "code": 409001, "message": "你已提交过异议，请等待处理" }
```

### 3.16 公示名单 `GET /api/v1/student/publicity/{id}`

- 鉴权：学生
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1301,
    "title": "第一轮拟录取名单公示",
    "startTime": "2026-11-05 08:00:00",
    "endTime": "2026-11-06 08:00:00",
    "status": 1,
    "canDispute": 1,
    "list": [
      {
        "studentNo": "2022****01",
        "studentName": "陈*丽",
        "labName": "人工智能实训室",
        "mentorName": "李海峰",
        "isSelf": 1
      }
    ]
  }
}
```

- 规则：`isSelf=1` 的行返回完整学号与姓名；其余行按脱敏规则返回
- 数据来源：批次归档（`locked = 1`）后，名单一律从 `round_snapshot` 中 `is_current = 1` 且 `snapshot_type = 4` 的当前归档快照渲染；归档前从实时 `admission` 渲染

### 3.17 导师工作台 `GET /api/v1/teacher/dashboard`

- 鉴权：导师
- **盲选门禁**：`NOW() < 当前轮 apply_end` 时 `applicantCount = 0` 且 `applicantVisible = 0`，不返回任何报名人数
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "round": { "roundNo": 1, "status": 3, "statusText": "面试中", "countdownSeconds": 3600 },
    "quota": 4,
    "quotaUsed": 2,
    "remainQuota": 2,
    "applicantCount": 12,
    "applicantVisible": 1,
    "pendingScoreCount": 5,
    "pendingNomination": 1,
    "pendingWaitlistAdjust": 0
  }
}
```

### 3.18 报名学生 `GET /api/v1/teacher/applicants`

- 鉴权：导师
- 说明：仅返回将本人列为意向的学生；不返回其他导师的评语与拟录取决定
- **时间门禁**：`NOW() < 当前轮 apply_end` 时返回 `visible = 0` 且 `list` 为空，前端展示「填报进行中，结束后可查看」；填报截止后才允许查看
- **盲选约束**：响应中不得包含学生意向数量、其他意向导师、提交时间等任何可推断「该生是否把我当备选」的字段
- 查询参数：`interviewStatus`、`scoreStatus`、`keyword`、`pageNum`、`pageSize`
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "visible": 1,
    "total": 12,
    "pageNum": 1,
    "pageSize": 10,
    "list": [
      {
        "studentId": 1001,
        "studentNo": "2022****01",
        "studentName": "陈*丽",
        "college": "计算机学院",
        "major": "软件工程",
        "grade": "2022",
        "sessionName": "第一场",
        "interviewDate": "2026-11-02",
        "totalScore": 85.75,
        "scoreStatus": 2,
        "scoreStatusText": "已评分",
        "admissionStatus": 1,
        "admissionStatusText": "待确认"
      }
    ]
  }
}
```

### 3.19 查看评分 `GET /api/v1/teacher/scores/{studentId}`

- 鉴权：导师
- 前置校验：该学生必须选择当前导师且已排期；仅返回当前导师本人的评分，未评分时 `data = null`
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1001,
    "studentId": 1001,
    "mentorId": 11,
    "mentorName": "李海峰",
    "studentNo": "2022****01",
    "studentName": "陈*丽",
    "attitudeScore": 90.00,
    "logicScore": 85.00,
    "programmingScore": 88.00,
    "timeScore": 80.00,
    "systemTotal": 85.75,
    "manualTotal": null,
    "finalTotal": 85.75,
    "adjustReason": null,
    "comment": "基础扎实，项目经历丰富",
    "status": 2
  }
}
```

- 失败响应：`{ "code": 403001, "message": "仅导师可录入评分" }`

### 3.20 保存/提交拟录取 `POST /api/v1/teacher/nominations`

- 鉴权：导师
- 请求：

```json
{
  "roundId": "BIGINT, 轮次ID, 必填",
  "studentIds": ["BIGINT, 学生ID列表, 必填"],
  "submit": "TINYINT, 1提交 0存草稿, 必填"
}
```

- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "submittedCount": 2,
    "quota": 4,
    "quotaUsed": 2,
    "remainQuota": 2
  }
}
```

- 失败响应：

```json
{ "code": 400003, "message": "超出个人名额上限（4 人）" }
{ "code": 400005, "message": "当前不在拟录取时间窗内" }
{ "code": 409001, "message": "拟录取名单已提交，不可修改" }
```

### 3.20.1 我的拟录取列表 `GET /api/v1/teacher/nominations`

- 鉴权：导师
- 查询参数：`roundId`（可选，缺省取当前轮）
- 说明：仅返回当前导师本人本轮 `nomination` 记录；`studentNo` / `studentName` 脱敏；`status` 取 03 §3.10（1 草稿、2 已提交、3 已作废），`statusText` 与状态值同源映射。
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": 501,
      "studentId": 1001,
      "studentNo": "2022****01",
      "studentName": "陈*丽",
      "totalScore": 85.75,
      "status": 2,
      "statusText": "已提交"
    }
  ]
}
```

### 3.20.2 我的录取名单 `GET /api/v1/teacher/admissions`

- 鉴权：导师
- 查询参数：`roundId`（可选，缺省取当前轮）
- 说明：仅返回批次签发后生成的本导师 `admission` 记录；统计卡口径为个人名额 `quota`、已确认数 `confirmedCount`（`status ∈ {2,3}`）、待确认数 `pendingCount`（`status = 1`）、剩余名额 `remainQuota`（`quota - confirmedCount - pendingCount`）；`status` 取 03 §3.12。
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "quota": 4,
    "confirmedCount": 2,
    "pendingCount": 1,
    "remainQuota": 1,
    "items": [
      {
        "id": 901,
        "studentId": 1001,
        "studentNo": "2022****01",
        "studentName": "陈*丽",
        "status": 2,
        "statusText": "已确认",
        "confirmTime": "2026-11-05 10:12:30"
      }
    ]
  }
}
```

### 3.20.3 发送确认提醒 `POST /api/v1/teacher/admissions/{id}/remind`

- 鉴权：导师
- 路径参数：`id`（`admission.id`）
- 成功响应：`{ "code": 200, "message": "success", "data": null }`
- 副作用：向该录取记录对应学生推送站内通知「请尽快确认录取」；同一学生 24 小时内重复调用幂等返回成功，不重复推送。
- 失败响应：

```json
{ "code": 403001, "message": "无权操作他人的录取记录" }
```

### 3.21 递补名单 `GET /api/v1/teacher/waitlist`

- 鉴权：导师
- 查询参数：`roundId`
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": 1101,
      "rankNo": 1,
      "studentId": 1002,
      "studentNo": "2022****02",
      "studentName": "张*强",
      "totalScore": 82.00,
      "isManual": 0,
      "adjustReason": null,
      "applyStatus": 1,
      "applyStatusText": "待递补"
    }
  ]
}
```

### 3.22 调整递补顺位 `PUT /api/v1/teacher/waitlist/rank`

- 鉴权：导师
- 请求：

```json
{
  "roundId": "BIGINT, 轮次ID, 必填",
  "items": [
    { "waitlistId": "BIGINT, 递补记录ID, 必填", "rankNo": "INT, 新顺位, 必填" }
  ],
  "adjustReason": "string, 调整理由, 必填"
}
```

- 成功响应：`{ "code": 200, "message": "success", "data": null }`
- 副作用：写入 `operation_log`，相关记录 `is_manual=1`

### 3.23 本室工作台 `GET /api/v1/leader/dashboard`

- 鉴权：负责人
- 查询参数：无
- **盲选门禁**：`NOW() < 当前轮 apply_end` 时 `applicantCount = 0`；填报截止后仅返回本室聚合数量，不提供名单下钻与任何学生标识
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "round": {
      "roundNo": 1,
      "roundName": "第一轮双选",
      "status": 3,
      "statusText": "面试中",
      "countdownSeconds": 3600
    },
    "mentorCount": 5,
    "totalQuota": 20,
    "quotaUsed": 8,
    "remainQuota": 12,
    "applicantCount": 56,
    "pendingScoreCount": 18,
    "todo": [
      { "type": "SCHEDULE", "text": "待发布面试排期" },
      { "type": "SCORE", "text": "待录分 18 人" }
    ]
  }
}
```

- 字段说明：
  - `round` 无当前轮次时为 `null`；`countdownSeconds` 无后续时间节点时为 `null`
  - `pendingScoreCount` 仅统计已保存草稿（status = 1）的评分，未录分学生不计入
  - `todo.type` 取 `SCHEDULE`（待发布面试排期）、`SCORE`（待录分）、`NOMINATION`（待汇总本室名单）
  - `todo` 项固定包含 `type`、`text`，`count` 与 `target` 为可选字段，为 `null` 时不序列化
- 失败响应：`{ "code": 403001, "message": "未绑定实训室" }`

### 3.23.1 本室导师与名额 `GET /api/v1/leader/mentors`

- 鉴权：负责人
- 说明：返回当前负责人所在实训室的全部导师，用于名额查看与面试官选择
- 查询参数：无
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": 11,
      "userId": 2001,
      "userNo": "20010001",
      "realName": "李海峰",
      "labId": 1,
      "labName": "人工智能实训室",
      "title": "副教授",
      "researchDirection": "多模态大模型",
      "quota": 4,
      "quotaUsed": 2,
      "remainQuota": 2,
      "status": 1,
      "accountStatus": 1
    }
  ]
}
```

- 失败响应：`{ "code": 403001, "message": "仅实训室负责人可查看本室导师" }`

### 3.24 调整导师名额 `PUT /api/v1/leader/mentors/{id}/quota`

- 鉴权：负责人
- 路径参数：`id` 为 `mentor_profile.id`
- **冻结校验**：`NOW() >= 第 1 轮 apply_start` 后返回 400004，强制调整只能走 3.50
- 请求：

```json
{ "quota": "INT, 新名额, 必填", "reason": "string, 调整理由, 必填" }
```

- 成功响应：`{ "code": 200, "message": "success", "data": null }`
- 失败响应：

```json
{ "code": 403001, "message": "该导师不属于本实训室" }
{ "code": 400002, "message": "本室导师名额之和超出实训室总名额（20 人）" }
{ "code": 400002, "message": "新名额不得小于已占用名额（2 人，含待确认占位）" }
{ "code": 400004, "message": "名额已冻结，请走管理员强制调整" }
```

### 3.24.1 修改面试场次 `PUT /api/v1/leader/interview-sessions/{id}`

- 鉴权：负责人
- 路径参数：`id` 为 `interview_session.id`
- 请求：与「3.25 新增面试场次」完全一致
- 校验：
  - 仅 `status = 1` 草稿场次可修改，已发布场次返回 400005
  - 场次必须属于当前负责人实训室，否则 403001
  - 轮次须处于面试中，面试日期须落在轮次面试时间窗内
- 成功响应：`{ "code": 200, "message": "success", "data": null }`
- 失败响应：

```json
{ "code": 404001, "message": "面试场次不存在" }
{ "code": 404001, "message": "选拔轮次不存在" }
{ "code": 400005, "message": "已发布场次不可修改" }
{ "code": 400005, "message": "当前不在面试阶段" }
{ "code": 403001, "message": "无权操作其他实训室的面试场次" }
{ "code": 400004, "message": "面试日期不在轮次面试时间窗内" }
{ "code": 400002, "message": "面试官须为本实训室在职导师" }
```

### 3.24.2 删除面试场次 `DELETE /api/v1/leader/interview-sessions/{id}`

- 鉴权：负责人
- 校验：仅草稿场次可删除；场次已有排期时不可删除
- 成功响应：`{ "code": 200, "message": "success", "data": null }`
- 失败响应：

```json
{ "code": 404001, "message": "面试场次不存在" }
{ "code": 400005, "message": "已发布场次不可删除" }
{ "code": 400005, "message": "场次已有排期，不可删除" }
{ "code": 403001, "message": "无权操作其他实训室的面试场次" }
```

### 3.25 新增面试场次 `POST /api/v1/leader/interview-sessions`

- 鉴权：负责人
- 请求：

```json
{
  "roundId": "BIGINT, 轮次ID, 必填",
  "sessionName": "string, 场次名称, 必填",
  "interviewDate": "date, 面试日期 yyyy-MM-dd, 必填",
  "startTime": "string, 开始时间 HH:mm, 必填",
  "endTime": "string, 结束时间 HH:mm, 必填",
  "location": "string, 地点, 必填",
  "capacity": "INT, 容量, 必填",
  "interviewerIds": ["BIGINT, 面试官账号ID列表（sys_user.id），至少 1 人, 必填"]
}
```

- 字段说明：
  - `interviewerIds` 持久化到 `interview_session_interviewer`，同一场次同一面试官唯一键去重。
  - 面试官必须是本室在职导师（`mentor_profile.lab_id` 匹配且 `sys_user.status = 1`），否则返回 400002。
- 成功响应：`{ "code": 200, "message": "success", "data": 701 }`（`data` 为新建场次 ID，初始状态固定为 1 草稿）
- 失败响应：

```json
{ "code": 400002, "message": "面试官须为本实训室在职导师" }
{ "code": 400001, "message": "结束时间必须晚于开始时间" }
```

### 3.25.1 场次列表 `GET /api/v1/leader/interview-sessions`

- 鉴权：负责人
- 查询参数：`roundId`（可选，默认当前轮）
- 成功响应（`PUT /api/v1/leader/interview-sessions/{id}` 详情同构）：

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": 701,
      "roundId": 3,
      "sessionName": "第一场",
      "interviewDate": "2026-11-02",
      "startTime": "14:00",
      "endTime": "15:30",
      "location": "实验楼 A301",
      "capacity": 30,
      "scheduledCount": 28,
      "interviewerIds": [20010001, 20010002],
      "interviewerNames": ["李海峰", "王建国"],
      "status": 1,
      "statusText": "草稿"
    }
  ]
}
```

- 说明：按面试日期、开始时间升序返回
- 失败响应：`{ "code": 403001, "message": "仅实训室负责人可操作面试场次" }`

### 3.25.2 排期列表 `GET /api/v1/leader/interview-schedules`

- 鉴权：负责人
- 查询参数：`roundId`（可选，默认最近轮次）
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": 801,
      "roundId": 3,
      "labId": 1,
      "labName": "人工智能实训室",
      "mentorId": 11,
      "mentorName": "李海峰",
      "sessionId": 701,
      "sessionName": "第一场",
      "interviewDate": "2026-11-02",
      "startTime": "14:00",
      "endTime": "15:30",
      "studentId": 1001,
      "studentNo": "2022****01",
      "studentName": "陈*丽",
      "status": 1,
      "statusText": "待面试"
    }
  ]
}
```

- 说明：按面试日期、开始时间升序返回；每条排期对应一个“学生 + 导师”组合，同一学生可能有多条；学号与姓名统一脱敏
- 失败响应：`{ "code": 403001, "message": "仅实训室负责人可操作面试排期" }`

### 3.25.3 自动分配排期 `POST /api/v1/leader/interview-schedules/auto`

- 鉴权：负责人
- 请求：`{ "roundId": "BIGINT, 轮次ID, 必填" }`
- 分配逻辑：
  - 仅使用本室本轮 `status = 1` 的草稿场次
  - 按“学生 + 意向导师”组合分配：学生选择的每位导师各生成一条排期
  - 目标场次必须配置了该导师（`interview_session_interviewer`），并校验剩余容量
  - 同一学生的多条排期不得时间重叠
  - 已存在“学生 + 导师”排期的组合跳过，不重复分配
- 成功响应：`{ "code": 200, "message": "success", "data": null }`
- 失败响应：

```json
{ "code": 404001, "message": "选拔轮次不存在" }
{ "code": 403001, "message": "仅实训室负责人可操作面试排期" }
{ "code": 400002, "message": "请先创建面试场次" }
{ "code": 400002, "message": "导师 XXX 无可用场次或与学生其他面试冲突，无法完成自动分配" }
```

### 3.25.4 手工调整排期 `PUT /api/v1/leader/interview-schedules`

- 鉴权：负责人
- 请求：

```json
{
  "roundId": "BIGINT, 轮次ID, 必填",
  "items": [
    {
      "scheduleId": "BIGINT, 排期ID, 必填",
      "sessionId": "BIGINT, 目标场次ID, 必填"
    }
  ]
}
```

- 校验：
  - 排期与目标场次都必须属于当前负责人实训室
  - 目标场次必须为草稿状态，已发布场次不可作为目标
  - 目标场次必须配置了该排期的导师
  - 调整后校验学生时间冲突（409001）与场次容量（400002）
- 成功响应：`{ "code": 200, "message": "success", "data": null }`
- 失败响应：

```json
{ "code": 400001, "message": "调整项不能为空" }
{ "code": 404001, "message": "选拔轮次不存在" }
{ "code": 404001, "message": "面试排期不存在" }
{ "code": 404001, "message": "目标场次不存在" }
{ "code": 403001, "message": "仅实训室负责人可操作面试排期" }
{ "code": 400005, "message": "已发布场次不可调整" }
{ "code": 400002, "message": "目标场次未配置该导师" }
{ "code": 409001, "message": "存在学生时间冲突" }
{ "code": 400002, "message": "场次超出容量" }
```

### 3.25.5 待排学生列表 `GET /api/v1/leader/interview-schedules/unassigned`

- 鉴权：负责人
- 查询参数：`roundId`（可选，默认最近轮次）
- 说明：返回本室已提交意向、但尚无对应“学生 + 导师”排期的组合；学号与姓名脱敏，供拖拽排期使用
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "studentId": 1002,
      "studentNo": "2022****02",
      "studentName": "张*",
      "mentorId": 11,
      "mentorName": "李海峰"
    }
  ]
}
```

- 失败响应：`{ "code": 403001, "message": "仅实训室负责人可操作面试排期" }`

### 3.25.6 拖拽排期 `POST /api/v1/leader/interview-schedules/assign`

- 鉴权：负责人
- 请求：

```json
{
  "roundId": "BIGINT, 轮次ID, 必填",
  "studentId": "BIGINT, 学生ID, 必填",
  "mentorId": "BIGINT, 导师档案ID, 必填",
  "sessionId": "BIGINT, 草稿场次ID, 必填"
}
```

- 校验：轮次处于面试阶段；场次属于本室且为草稿；目标导师属于本室且在职；场次已配置该导师；学生本轮已提交填报且选择了该导师；同一“学生 + 导师”本轮仅一条排期；场次未超容量；与该生其他场次无时间重叠
- 成功响应：`{ "code": 200, "message": "success", "data": 801 }`
- 失败响应：

```json
{ "code": 404001, "message": "选拔轮次不存在" }
{ "code": 404001, "message": "面试场次不存在" }
{ "code": 400005, "message": "当前不在面试阶段" }
{ "code": 400005, "message": "仅草稿场次可拖拽排期" }
{ "code": 400002, "message": "目标导师不可选" }
{ "code": 400002, "message": "该场次未配置目标导师" }
{ "code": 400002, "message": "该学生本轮未提交填报" }
{ "code": 400002, "message": "场次已满，无法排期" }
{ "code": 403001, "message": "该学生未选择该导师" }
{ "code": 403001, "message": "无权使用其他实训室的场次" }
{ "code": 409001, "message": "该学生已在该导师处排期" }
{ "code": 409001, "message": "与该生其他面试场次时间冲突" }
```

### 3.25.7 登记面试状态 `PUT /api/v1/leader/interview-schedules/{id}/status`

- 鉴权：负责人
- 请求：`{ "status": "TINYINT, 2 已完成 / 3 缺席, 必填" }`
- 校验：排期属于本室；批次未锁定
- 成功响应：`{ "code": 200, "message": "success", "data": null }`
- 失败响应：

```json
{ "code": 400001, "message": "面试状态仅支持已完成或缺席" }
{ "code": 400005, "message": "批次已锁定，不可登记面试状态" }
{ "code": 403001, "message": "无权操作其他实训室的排期" }
{ "code": 404001, "message": "面试排期不存在" }
```

### 3.26 发布排期 `POST /api/v1/leader/interview-sessions/publish`

- 鉴权：负责人
- 请求：

```json
{ "roundId": "BIGINT, 轮次ID, 必填" }
```

- 成功响应：

```json
{ "code": 200, "message": "success", "data": { "sessionCount": 3, "studentCount": 56, "noticeCount": 56 } }
```

- 失败响应：

```json
{ "code": 409001, "message": "存在学生时间冲突：陈爱丽 14:00-15:30 已在另一场" }
{ "code": 409001, "message": "存在面试官时间冲突" }
{ "code": 400002, "message": "场次超出容量" }
{ "code": 400002, "message": "存在 3 名学生未排期" }
```

### 3.26.1 取消并重排 `POST /api/v1/leader/interview-sessions/publish/cancel`

- 鉴权：负责人
- 说明：将本室本轮已发布场次回退为草稿，并向学生推送「面试安排变更」；已推送通知不可撤回，重新发布后再次通知
- 请求：

```json
{
  "roundId": "BIGINT, 轮次ID, 必填",
  "reason": "string, 取消原因, 必填, 最长200字"
}
```

- 成功响应：`{ "code": 200, "message": "success", "data": { "sessionCount": 3, "studentCount": 56, "noticeCount": 56 } }`
- 失败响应：

```json
{ "code": 404001, "message": "选拔轮次不存在" }
{ "code": 400005, "message": "批次已锁定，不可取消排期" }
{ "code": 400005, "message": "当前不在面试阶段" }
{ "code": 400005, "message": "无可取消的已发布场次" }
```

### 3.27 导师录入评分 `POST /api/v1/teacher/scores`

- 鉴权：导师
- 说明：导师只能给选择本人且已排期的学生评分；评分按 `(round_id, mentor_id, student_id)` 唯一，仅用于本人拟录取
- 请求：

```json
{
  "roundId": "BIGINT, 轮次ID, 必填",
  "studentId": "BIGINT, 学生ID, 必填",
  "attitudeScore": "decimal, 学习态度 0-100, 必填",
  "logicScore": "decimal, 逻辑思维 0-100, 必填",
  "programmingScore": "decimal, 编程基础 0-100, 必填",
  "timeScore": "decimal, 时间投入 0-100, 必填",
  "manualTotal": "decimal, 手动覆写总分, 可选",
  "adjustReason": "string, 手动调整理由", 
  "comment": "string, 评语, 可选, 最长1000字",
  "submit": "TINYINT, 1提交 0存草稿, 必填"
}
```

- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1001,
    "systemTotal": 85.75,
    "manualTotal": 88.00,
    "finalTotal": 88.00,
    "status": 2
  }
}
```

- 失败响应：

```json
{ "code": 400001, "message": "分数必须在 0-100 之间" }
{ "code": 400001, "message": "手动调整总分时必须填写理由" }
{ "code": 400004, "message": "当前不在面试时间窗内" }
{ "code": 400005, "message": "当前不在面试阶段" }
{ "code": 400005, "message": "批次已锁定，不可录入评分" }
{ "code": 403001, "message": "该学生未选择该导师或尚未排期" }
```

### 3.27.1 本室评分汇总 `GET /api/v1/leader/scores`

- 鉴权：负责人
- 说明：按“学生 + 导师”返回本室本轮全部评分，供负责人汇总；负责人不录入、不修改分数
- 查询参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| roundId | BIGINT | 否 | 轮次 ID，默认最近轮次 |
| keyword | string | 否 | 学号或姓名关键词 |
| status | INT | 否 | 0 未评分 1 草稿 2 已提交 |
| pageNum | long | 否 | 页码，默认 1 |
| pageSize | long | 否 | 每页条数，默认 10，上限 100 |

- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 1,
    "pageNum": 1,
    "pageSize": 10,
    "list": [
      {
        "id": 1001,
        "studentId": 1001,
        "studentNo": "2022****01",
        "studentName": "陈*丽",
        "mentorId": 11,
        "mentorName": "李海峰",
        "sessionId": 701,
        "sessionName": "第一场",
        "attitudeScore": 90.00,
        "logicScore": 85.00,
        "programmingScore": 88.00,
        "timeScore": 80.00,
        "systemTotal": 85.75,
        "manualTotal": 88.00,
        "finalTotal": 88.00,
        "status": 2,
        "statusText": "已提交"
      }
    ]
  }
}
```

- 说明：列表以本室本轮“学生 + 导师”排期为基准，按学号升序返回；`status = 0` 时 `id` 与各项评分字段均为 `null`，`statusText = "未评分"`
- 失败响应：`{ "code": 403001, "message": "仅实训室负责人可录入评分" }`

### 3.27.2 导师 Excel 批量导入评分 `POST /api/v1/teacher/scores/import`

- 鉴权：导师
- 请求：`multipart/form-data`，字段名 `file`，仅支持 `.xlsx`
- Excel 列顺序（首行为表头）：

| 列 | 内容 |
|---|---|
| A | 学号 |
| B | 学习态度 |
| C | 逻辑思维 |
| D | 编程基础 |
| E | 时间投入 |
| F | 评语 |

- 说明：
  - 使用最近轮次；仅处理选择本人且已排期的学生
  - 通过校验的行统一按 `submit = 1` 提交
  - 失败行跳过并返回明细；全部失败时仍返回 200 + `failList`
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "totalCount": 56,
    "successCount": 54,
    "failCount": 2,
    "failList": [
      { "rowNo": 17, "userNo": "20229999", "reason": "学号不存在或不是学生账号" },
      { "rowNo": 23, "userNo": "20220023", "reason": "分数必须在 0-100 之间" }
    ]
  }
}
```

- 失败响应：

```json
{ "code": 400001, "message": "仅支持 .xlsx 格式文件" }
{ "code": 400001, "message": "Excel 无有效数据" }
{ "code": 400004, "message": "当前不在面试时间窗内" }
{ "code": 400005, "message": "当前不在面试阶段" }
{ "code": 400005, "message": "批次已锁定，不可录入评分" }
{ "code": 404001, "message": "当前无选拔轮次" }
```

### 3.28 本室拟录取汇总 `GET /api/v1/leader/nominations`

- 鉴权：负责人
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "labQuota": 20,
    "quotaUsed": 8,
    "remainQuota": 12,
    "conflictCount": 1,
    "mentors": [
      {
        "mentorId": 11,
        "mentorName": "李海峰",
        "quota": 4,
        "nominatedCount": 4,
        "submitStatus": 2,
        "submitStatusText": "已提交"
      }
    ],
    "conflicts": [
      {
        "studentId": 1001,
        "studentName": "陈*丽",
        "mentorNames": ["李海峰", "王建国"],
        "reason": "同一学生被本室 2 名导师拟录取"
      }
    ]
  }
}
```

- 字段说明：
  - `nominatedCount` 为该导师本轮已提交与草稿拟录取记录数之和，即实际已勾选人数
  - `submitStatus`：1 待提交（存在草稿、无已提交）、2 已提交（存在已提交记录）、0 未提交（无记录）
  - `conflictCount` 与 `conflicts` 仅统计已提交记录，草稿不参与冲突判定
- 失败响应：

```json
{ "code": 403001, "message": "仅实训室负责人可操作本室名单" }
{ "code": 404001, "message": "当前无选拔轮次" }
```

### 3.29 提交本室名单 `POST /api/v1/leader/nominations/submit`

- 鉴权：负责人
- 请求：`{ "roundId": "BIGINT, 轮次ID, 必填" }`
- 成功响应：`{ "code": 200, "message": "success", "data": { "admissionCount": 8, "conflictCount": 0 } }`（`admissionCount` 为本室拟录取条数，待批次签发，不代表已生成 `admission`）
- 副作用：标记本室名单已汇总，**不生成 `admission`、不推送录取结果**；`admission` 统一由 `nomination_submit_end` 批次按学生维度签发（BR-P5-02 / BR-P5-03）
- 失败响应：

```json
{ "code": 404001, "message": "选拔轮次不存在" }
{ "code": 400005, "message": "批次已锁定，不可提交本室名单" }
{ "code": 400005, "message": "当前不在名单提交时间窗内" }
```

### 3.30 本室内部调剂 `POST /api/v1/leader/reallocation`

- 鉴权：负责人
- 说明：仅在阶段 6 `inner_adjust_start ~ inner_adjust_end` 内开放；提交后生成 `admission.status = 1`、`pending_type = 4` 的待确认记录，学生确认后生效；确认截止 = `min(inner_adjust_end, 通知时刻 + 24 小时)`；逾期或拒绝时释放名额并触发同导师递补，不影响学生阶段 7 跨室调剂资格（需勾选服从跨室）
- 请求：

```json
{
  "roundId": "BIGINT, 轮次ID, 必填",
  "studentId": "BIGINT, 学生ID, 必填",
  "toMentorId": "BIGINT, 目标导师ID, 必填",
  "reason": "string, 调剂说明, 必填, 最长500字"
}
```

- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "reallocationId": 1401,
    "admissionId": 902,
    "status": 1,
    "confirmDeadline": "2026-11-05 18:00:00"
  }
}
```

- 失败响应：

```json
{ "code": 400001, "message": "调剂说明不能为空" }
{ "code": 400002, "message": "学生未勾选服从实训室内部调剂" }
{ "code": 400002, "message": "目标导师剩余名额不足" }
{ "code": 400004, "message": "本轮未配置内部调剂时间窗" }
{ "code": 400004, "message": "当前不在内部调剂时间窗内" }
{ "code": 400005, "message": "批次已锁定，不可调剂" }
{ "code": 400005, "message": "学生本轮已有录取记录" }
{ "code": 403001, "message": "该学生不属于本实训室" }
{ "code": 403001, "message": "内部调剂只能选择本室导师" }
```

### 3.30.1 本室内部调剂候选 `GET /api/v1/leader/reallocation/candidates`

- 鉴权：负责人
- 查询参数：`roundId`（可选，默认最近轮次）、`pageNum`（默认 1）、`pageSize`（默认 10，上限 100）
- 筛选条件：
  - 本轮意向已提交（`status = 2`）且勾选服从本室内部调剂
  - 意向中包含本实训室，且本轮无有效录取记录（status ∈ {1,2,3}）
  - 本室存在剩余名额大于 0 的导师
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 1,
    "pageNum": 1,
    "pageSize": 10,
    "list": [
      {
        "studentId": 1001,
        "studentNo": "2022****01",
        "studentName": "陈*丽",
        "originLabId": 1,
        "originLabName": "人工智能实训室",
        "acceptInnerAdjust": 1,
        "acceptCrossAdjust": 0,
        "totalScore": 74.25,
        "availableMentors": [
          {
            "mentorId": 11,
            "mentorName": "李海峰",
            "labId": 1,
            "labName": "人工智能实训室",
            "remainQuota": 2
          }
        ]
      }
    ]
  }
}
```

- 说明：`totalScore` 无面试评分时为 `null`；列表按总分降序、总分相同按学生 ID 升序，`null` 总分排在最后
- 失败响应：`{ "code": 403001, "message": "仅实训室负责人可查看本室调剂候选" }`

### 3.30.2 本室录取确认汇总 `GET /api/v1/leader/admissions`

- 鉴权：负责人
- 查询参数：`roundId`（可选，默认最近轮次）、`finalOnly`（可选，默认 false；true 仅返回已确认/已入组记录）
- 说明：仅返回负责人所在实训室的录取记录；学号与姓名脱敏；`confirmedCount` 统计 status = 2，`enrolledCount` 统计 status = 3，`abandonedCount` 统计 status ∈ {4,5}
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "roundId": 1,
    "labId": 1,
    "labName": "人工智能实训室",
    "labQuota": 20,
    "allocatedQuota": 18,
    "quotaUsed": 8,
    "remainQuota": 12,
    "totalCount": 10,
    "pendingCount": 1,
    "confirmedCount": 6,
    "enrolledCount": 2,
    "abandonedCount": 1,
    "items": [
      {
        "id": 901,
        "studentId": 1001,
        "studentNo": "2022****01",
        "studentName": "陈*丽",
        "mentorId": 11,
        "mentorName": "李海峰",
        "totalScore": 85.75,
        "status": 2,
        "statusText": "已确认",
        "sourceType": 1,
        "sourceTypeText": "拟录取",
        "confirmTime": "2026-11-05 10:00:00",
        "confirmDeadline": "2026-11-05 12:00:00"
      }
    ]
  }
}
```

- 失败响应：`{ "code": 403001, "message": "仅实训室负责人可查看本室录取情况" }`

### 3.30.3 导出本室最终名单 `GET /api/v1/leader/admissions/export`

- 鉴权：负责人
- 查询参数：`roundId`（可选，默认最近轮次）
- 说明：仅导出负责人所在实训室的录取记录；归档后从最终归档快照渲染
- 成功响应：`application/octet-stream`，文件名 `leader-results.xlsx`
- 失败响应：`{ "code": 403001, "message": "仅实训室负责人可查看本室录取情况" }`

### 3.30.4 本室递补名单 `GET /api/v1/leader/waitlist`

- 鉴权：负责人
- 查询参数：`roundId`（可选，默认最近轮次）
- 说明：返回本室全部导师的递补名单，按导师、顺位升序；学号与姓名脱敏
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": 1101,
      "roundId": 1,
      "mentorId": 11,
      "mentorName": "李海峰",
      "rankNo": 1,
      "studentId": 1002,
      "studentNo": "2022****02",
      "studentName": "张*强",
      "totalScore": 78.50,
      "isManual": 0,
      "adjustReason": null,
      "applyStatus": 1,
      "applyStatusText": "待处理"
    }
  ]
}
```

- 失败响应：`{ "code": 403001, "message": "仅实训室负责人可操作本室递补名单" }`

### 3.30.5 调整本室递补顺位 `PUT /api/v1/leader/waitlist/rank`

- 鉴权：负责人
- 请求：

```json
{
  "roundId": "BIGINT, 轮次ID, 必填",
  "items": [
    { "waitlistId": "BIGINT, 递补记录ID, 必填", "rankNo": "INT, 新顺位, 从1开始" }
  ],
  "adjustReason": "string, 调整理由, 必填, 最长200字"
}
```

- 校验：递补记录必须属于本室导师；同一导师内顺位不可重复；批次锁定后拒绝；调整写 `operation_log`
- 成功响应：`{ "code": 200, "message": "success", "data": null }`
- 失败响应：

```json
{ "code": 400001, "message": "调整理由不能为空" }
{ "code": 400002, "message": "同一导师递补顺位重复" }
{ "code": 400002, "message": "递补记录不属于该轮次" }
{ "code": 400005, "message": "批次已锁定，不可调整递补顺位" }
{ "code": 403001, "message": "无权调整其他实训室的递补记录" }
{ "code": 404001, "message": "递补记录不存在" }
{ "code": 404001, "message": "选拔轮次不存在" }
```

### 3.30.6 本室报名学生列表 `GET /api/v1/leader/applicants`

- 鉴权：负责人
- 查询参数：`roundId`（可选）、`keyword`（学号/姓名）、`pageNum`、`pageSize`
- 盲选门禁：填报截止前 `visible = 0` 且列表为空
- 返回：学生基础信息、全部意向（实训室 + 导师）、两个调剂意愿、面试场次、总分、录取状态；学号与姓名脱敏
- 失败响应：`{ "code": 403001, "message": "仅实训室负责人可查看本室报名学生" }`

### 3.30.7 本室报名学生档案 `GET /api/v1/leader/students/{studentId}/archive`

- 鉴权：负责人
- 查询参数：`roundId`（可选）
- 校验：填报截止后；学生已提交意向且包含本实训室
- 成功响应：学生档案字段同导师端档案接口，学号与姓名脱敏；未创建档案返回 `data: null`
- 失败响应：

```json
{ "code": 403001, "message": "填报截止后方可查看学生档案" }
{ "code": 403001, "message": "该学生未报名本实训室" }
{ "code": 404001, "message": "学生不存在" }
```

### 3.30.8 查看导师拟录取名单 `GET /api/v1/leader/nominations/{mentorId}`

- 鉴权：负责人
- 查询参数：`roundId`（可选）
- 返回：导师名额、已占用、当前选中学生 ID、候选学生（学号/姓名脱敏、总分、是否已勾选）
- 失败响应：`{ "code": 403001, "message": "无权查看其他实训室导师的名单" }`

### 3.30.9 调整导师拟录取名单 `PUT /api/v1/leader/nominations/{mentorId}`

- 鉴权：负责人
- 请求：

```json
{
  "roundId": "BIGINT, 轮次ID, 必填",
  "studentIds": ["BIGINT, 勾选学生ID列表"],
  "reason": "string, 调整理由, 必填, 最长200字"
}
```

- 校验：名单提交时间窗内、批次未锁定；导师属于本室；学生已提交意向且选择该导师；已录入面试评分；不得超过导师个人名额
- 副作用：覆盖该导师本轮名单并置为已提交，按差额调整 `quota_used`，写 `operation_log`
- 成功响应：`{ "code": 200, "message": "success", "data": { "submittedCount": 3, "quota": 4, "quotaUsed": 3, "remainQuota": 1 } }`
- 失败响应：

```json
{ "code": 400005, "message": "当前不在拟录取时间窗内" }
{ "code": 400005, "message": "批次已锁定，不可修改拟录取名单" }
{ "code": 400003, "message": "超出个人名额上限（4 人）" }
{ "code": 400002, "message": "存在未录入面试评分的学生，不可列入拟录取" }
{ "code": 400002, "message": "存在未选择本人的意向学生，不可列入拟录取" }
{ "code": 403001, "message": "无权调整其他实训室导师的名单" }
```

### 3.31 轮次配置 `PUT /api/v1/admin/rounds/{id}`

- 鉴权：管理员
- 修改限制：`locked = 1` 时任何字段不可修改；`status >= 3`（面试中及之后）时四维权重不可修改，避免已计算的 `system_total` / `final_total` 与 `nomination.total_score` 快照随配置漂移
- 请求：

```json
{
  "roundName": "string, 轮次名称, 必填",
  "applyStart": "datetime, 必填",
  "applyEnd": "datetime, 必填",
  "interviewStart": "datetime, 必填",
  "interviewEnd": "datetime, 必填",
  "nominationStart": "datetime, 名单提交开始, 必填",
  "nominationSubmitEnd": "datetime, 名单提交截止, 必填",
  "confirmStart": "datetime, 学生确认开始, 必填",
  "nominationEnd": "datetime, 确认截止, 必填",
  "innerAdjustStart": "datetime, 阶段6内部调剂开始, 可选；为空表示不开放",
  "innerAdjustEnd": "datetime, 阶段6内部调剂结束, 可选；必须与开始时间同时填写且不晚于 adjustStart",
  "adjustStart": "datetime, 统筹调剂开始, 必填",
  "adjustEnd": "datetime, 统筹调剂结束, 必填",
  "weightAttitude": "decimal, 学习态度权重, 必填",
  "weightLogic": "decimal, 逻辑思维权重, 必填",
  "weightProgramming": "decimal, 编程基础权重, 必填",
  "weightTime": "decimal, 时间投入权重, 必填"
}
```

- 成功响应：`{ "code": 200, "message": "success", "data": { "id": 2 } }`
- 失败响应：

```json
{ "code": 400002, "message": "四维权重合计必须为 100" }
{ "code": 400002, "message": "面试开始时间不得早于填报结束时间" }
{ "code": 400002, "message": "名单提交截止必须早于学生确认开始" }
{ "code": 400002, "message": "调剂开始时间不得早于确认截止时间" }
{ "code": 400002, "message": "调剂开始时间必须早于调剂结束时间" }
{ "code": 400002, "message": "本轮时间窗与第 2 轮重叠" }
{ "code": 400005, "message": "轮次已进入面试阶段，四维权重不可修改" }
{ "code": 400005, "message": "批次已锁定，不可修改轮次配置" }
```

### 3.31.1 全院名额总览 `GET /api/v1/admin/quotas`

- 鉴权：管理员
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "labId": 1,
      "labName": "人工智能实训室",
      "totalQuota": 20,
      "quotaSum": 18,
      "quotaUsedSum": 8,
      "remainQuota": 12
    }
  ]
}
```

- 字段说明：`totalQuota` 实训室总名额；`quotaSum` 本室导师个人名额合计；`quotaUsedSum` 已占用名额合计；`remainQuota = totalQuota - quotaUsedSum`（最小为 0）
- 导出 `GET /api/v1/admin/quotas/export`：鉴权管理员，返回 `application/octet-stream` Excel，列顺序为 实训室、总名额、导师名额合计、已占用、剩余名额

### 3.31.2 提拔负责人 `PUT /api/v1/admin/labs/{id}/leader`

- 鉴权：管理员
- 路径参数：`id` 为 `lab.id`
- 请求：

```json
{ "userId": "BIGINT, 目标导师账号 ID（sys_user.id）, 必填", "reason": "string, 提拔理由, 必填" }
```

- 校验：目标用户必须是该实训室在职导师（`mentor_profile.lab_id` 匹配、`sys_user.user_type = 2` 且 `status = 1`），否则返回 403001 / 400002
- 副作用：更新 `lab.leader_id`，写 `operation_log`（含前后负责人），向原负责人与新负责人推送通知
- 成功响应：`{ "code": 200, "message": "success", "data": null }`

### 3.32 批量导入学生 `POST /api/v1/admin/students/import`

- 鉴权：管理员
- Content-Type：`multipart/form-data`
- 参数：`file`（Excel，列：学号、姓名、学院、专业、年级、手机号、邮箱）
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "successCount": 198,
    "failCount": 2,
    "failList": [
      { "row": 15, "userNo": "20220015", "reason": "学号已存在" },
      { "row": 88, "userNo": "20220088", "reason": "手机号格式错误" }
    ],
    "failFileUrl": "/files/import/student-fail-20261109.xlsx"
  }
}
```

### 3.32.1 新增教师账号 `POST /api/v1/admin/mentors`

- 鉴权：管理员
- 请求：

```json
{
  "userNo": "string, 工号, 必填, 全局唯一",
  "realName": "string, 姓名, 必填",
  "labId": "BIGINT, 所属实训室, 必填",
  "title": "string, 职称, 可选",
  "researchDirection": "string, 研究方向, 可选",
  "researchProjects": "string, 在研项目, 可选, 最长1000字",
  "phone": "string, 手机号, 可选",
  "email": "string, 邮箱, 可选",
  "quota": "INT, 个人名额, 必填",
  "status": "TINYINT, 1启用 0禁用, 可选, 默认1",
  "leader": "boolean, 是否同时设为该室负责人, 可选, 默认 false"
}
```

- 成功响应：`{ "code": 200, "message": "success", "data": 920001 }`（`mentor_profile.id`）
- 说明：`phone`、`email` 落 `sys_user`；`researchProjects` 落 `mentor_profile`；`leader = true` 时创建账号后立即将该教师设为所属实训室负责人，原负责人权限自动失效，并写入操作日志与站内通知

### 3.32.2 批量导入教师 `POST /api/v1/admin/mentors/import`

- 鉴权：管理员
- Content-Type：`multipart/form-data`
- 参数：`file`（Excel，列：工号、姓名、实训室编码、职称、研究方向、手机号、邮箱）
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "successCount": 18,
    "failCount": 2,
    "failList": [
      { "row": 5, "userNo": "T9005", "reason": "工号已存在" },
      { "row": 9, "userNo": "T9009", "reason": "实训室编码不存在" }
    ]
  }
}
```

- 说明：逐行独立处理，单行失败不影响其他行；全部失败时返回 400002

### 3.33 三类调剂候选 `GET /api/v1/admin/reallocation/candidates`

- 鉴权：管理员
- 查询参数：`roundId`、`level`（1 内部调剂 2 跨室调剂 3 座谈安置）、`pageNum`、`pageSize`
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 15,
    "pageNum": 1,
    "pageSize": 10,
    "list": [
      {
        "studentId": 1003,
        "studentNo": "2022****03",
        "studentName": "刘*婷",
        "originLabId": 1,
        "originLabName": "人工智能实训室",
        "acceptInnerAdjust": 1,
        "acceptCrossAdjust": 0,
        "totalScore": 78.00,
        "availableMentors": [
          { "mentorId": 12, "mentorName": "王建国", "labId": 1, "labName": "人工智能实训室", "remainQuota": 2 }
        ]
      }
    ]
  }
}
```

### 3.34 执行调剂 `POST /api/v1/admin/reallocation`

- 鉴权：管理员
- 请求：

```json
{
  "roundId": "BIGINT, 轮次ID, 必填",
  "level": "TINYINT, 1内部调剂 2跨室调剂 3座谈安置, 必填",
  "items": [
    { "studentId": "BIGINT, 学生ID, 必填", "toMentorId": "BIGINT, 目标导师ID, 必填" }
  ],
  "reason": "string, 调剂说明, 可选"
}
```

- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": { "successCount": 3, "failCount": 0, "failList": [] }
}
```

- 失败响应：

```json
{ "code": 400002, "message": "学生未勾选对应级别的调剂意愿" }
{ "code": 400002, "message": "目标导师剩余名额不足" }
{ "code": 400005, "message": "学生本轮已有录取记录" }
```

### 3.35 发起公示 `POST /api/v1/admin/publicities`

- 鉴权：管理员
- 请求：

```json
{
  "roundId": "BIGINT, 轮次ID, 必填",
  "title": "string, 公示标题, 必填",
  "durationHours": "INT, 公示时长（小时）, 必填, 默认24"
}
```

- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1301,
    "startTime": "2026-11-05 08:00:00",
    "endTime": "2026-11-06 08:00:00",
    "admissionCount": 86,
    "status": 1
  }
}
```

### 3.35.1 公示名单明细 `GET /api/v1/admin/publicities/{id}/rows`

- 鉴权：管理员
- 路径参数：`id` 为 `publicity.id`
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1301,
    "title": "第 1 轮拟录取名单公示",
    "startTime": "2026-11-05 08:00:00",
    "endTime": "2026-11-06 08:00:00",
    "status": 1,
    "total": 86,
    "list": [
      {
        "admissionId": 3001,
        "studentId": 910002,
        "studentNo": "2022001",
        "studentName": "陈晓",
        "college": "信息工程学院",
        "major": "软件工程",
        "labId": 900101,
        "labName": "人工智能实训室",
        "mentorId": 920001,
        "mentorName": "张明",
        "finalTotal": 88.50,
        "status": 2,
        "statusText": "已确认",
        "confirmTime": "2026-11-04 10:00:00"
      }
    ]
  }
}
```

- 数据来源：本轮 `admission.status ∈ {2,3}` 的记录，按 `admission.id` 升序
- 说明：管理员视图返回完整学号与姓名，不做脱敏；`statusText` 与 `03_Database.md` 状态值同源映射

### 3.36 处理异议 `PUT /api/v1/admin/disputes/{id}/handle`

- 鉴权：管理员
- 请求：

```json
{
  "handleResult": "TINYINT, 1维持原结果 2调整录取 3退回重审, 必填",
  "handleOpinion": "string, 处理意见, 必填, 最长1000字",
  "adjustMentorId": "BIGINT, 调整后的导师ID, handleResult=2 时必填"
}
```

- 成功响应：`{ "code": 200, "message": "success", "data": { "id": 1201, "status": 3, "handleTime": "2026-11-05 16:00:00" } }`
- 副作用：推送站内通知给学生；`handleResult=2` 时同步调整 `admission` 并写 `operation_log`

### 3.37 确认最终名单 `POST /api/v1/admin/publicities/{id}/confirm`

- 鉴权：管理员
- 请求：无
- 成功响应：`{ "code": 200, "message": "success", "data": { "confirmedCount": 86, "status": 3 } }`
- 失败响应：`{ "code": 400005, "message": "仍有 2 条异议未处理，无法确认" }`
- 副作用：本轮 `admission` 状态批量置为 3 已入组，推送入组通知
- 数据来源：本接口只将实时 `admission` 置 3；确认结果的展示与导出在 `snapshot_type = 4` 归档快照生成后，一律从 `is_current = 1` 且 `snapshot_type = 4` 的快照渲染

### 3.38 我的档案 `GET /api/v1/student/archive`

- 鉴权：学生
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "userNo": "20220001",
    "realName": "陈爱丽",
    "college": "计算机学院",
    "major": "软件工程",
    "grade": "2022",
    "className": "软工2201",
    "gpa": 3.72,
    "ranking": 12,
    "englishLevel": "CET-6",
    "programmingLanguages": ["Java", "Python"],
    "techStack": ["Spring Boot", "Vue 3"],
    "projectExperience": "主导过校园二手交易平台后端开发",
    "competitionExperience": "蓝桥杯省二",
    "researchExperience": null,
    "internshipExperience": null,
    "weeklyHours": 12,
    "availableSlots": "工作日 19:00-22:00，周末全天",
    "otherDuties": "学生会技术部",
    "expectedDirection": "后端开发",
    "statement": "我选择这个方向的原因是……",
    "missingFields": []
  }
}
```

- `missingFields` 返回未完成的必填项 key 列表，为空表示可提交填报
- 未创建档案时返回 `data` 为 `null`

### 3.39 保存档案 `PUT /api/v1/student/archive`

- 鉴权：学生
- 请求：

```json
{
  "className": "string, 班级, 可选",
  "gpa": "decimal, 绩点 0-5, 可选",
  "ranking": "INT, 专业排名, 可选",
  "englishLevel": "string, 英语等级, 可选",
  "programmingLanguages": ["string, 编程语言，至少 1 项, 必填"],
  "techStack": ["string, 工具链, 可选"],
  "projectExperience": "string, 项目经历, 必填",
  "competitionExperience": "string, 竞赛经历, 可选",
  "researchExperience": "string, 科研经历, 可选",
  "internshipExperience": "string, 实习经历, 可选",
  "weeklyHours": "INT, 每周可投入小时 1-40, 必填",
  "availableSlots": "string, 可投入时段, 必填",
  "otherDuties": "string, 其他组织任职, 可选",
  "expectedDirection": "string, 期望方向, 可选",
  "statement": "string, 共享个人陈述 300-800 字, 必填"
}
```

- 成功响应：`{ "code": 200, "message": "success", "data": { "missingFields": [] } }`
- 说明：保存时只校验字段格式，不强制必填齐全；完整性由提交填报时统一校验
- 失败响应：

```json
{ "code": 400001, "message": "个人陈述需为 300-800 字" }
{ "code": 400001, "message": "每周可投入小时需在 1-40 之间" }
{ "code": 400001, "message": "编程语言至少选择 1 项" }
```

### 3.40 导师查看学生档案 `GET /api/v1/teacher/students/{studentId}/archive`

- 鉴权：导师
- 前置校验：该学生必须将当前导师列为意向，否则 403001
- **时间门禁**：填报截止前返回 403001，与报名名单一致
- 成功响应：字段同 `3.38`，但学号姓名脱敏，且不返回 `missingFields`

### 3.41 录取待确认中心 `GET /api/v1/student/confirm-center`

- 鉴权：学生
- 说明：**一律按 `status = 1` 检索**，`pendingType` 仅作展示标签
  - `pendingType = 1`：拟录取多选一
  - `pendingType = 2`：递补待确认
  - `pendingType = 3`：异议调整待确认
  - `pendingType = 4`：内部调剂待确认
- 门禁：`type = 1` 需 `NOW() >= confirm_start`；`type ∈ {2,3,4}` 按记录自身 `confirm_deadline` 判定；公示开始后中心只读
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 2,
    "items": [
      {
        "id": 901,
        "admissionId": 901,
        "pendingType": 1,
        "pendingTypeText": "拟录取多选一",
        "labId": 1,
        "labName": "人工智能实训室",
        "mentorId": 11,
        "mentorName": "李海峰",
        "sourceType": 1,
        "sourceTypeText": "拟录取",
        "totalScore": 85.75,
        "confirmDeadline": "2026-11-04 12:00:00",
        "countdownSeconds": 7200,
        "actions": ["ACCEPT", "REJECT"]
      },
      {
        "id": 902,
        "admissionId": 902,
        "pendingType": 2,
        "pendingTypeText": "递补待确认",
        "labId": 1,
        "labName": "人工智能实训室",
        "mentorId": 12,
        "mentorName": "王建国",
        "sourceType": 2,
        "sourceTypeText": "递补",
        "totalScore": 82.00,
        "confirmDeadline": "2026-11-04 12:29:00",
        "countdownSeconds": 1800,
        "actions": ["ACCEPT", "REJECT"]
      }
    ]
  }
}
```

- `NOW() < confirm_start` 时返回空列表；批次锁定后只返回历史，不接受操作

### 3.42 待确认响应 `POST /api/v1/student/confirm-center/{id}/respond`

- 鉴权：学生
- 请求：

```json
{
  "action": "string, ACCEPT 或 REJECT, 必填",
  "reason": "string, 拒绝原因, 可选"
}
```

- 成功响应：`{ "code": 200, "message": "success", "data": { "id": 901, "status": 2 } }`
- 前置校验：该生同轮若已存在 `status ∈ {2,3}` 的记录，直接拒绝，防止被抢录后仍可接受遗留待确认卡片
- 副作用：
  - `ACCEPT`：`status = 2`、`active_flag = 1`；该生同轮其他 `status = 1` 记录置 4、`active_flag = NULL` 并释放名额
  - `REJECT`：`status = 4`、`active_flag = NULL`，释放对应名额并触发递补
- 失败响应：

```json
{ "code": 403001, "message": "无权操作他人的待确认记录" }
{ "code": 400004, "message": "已超过确认截止时间" }
{ "code": 400005, "message": "本轮已有录取去向，不可重复确认" }
```

### 3.43 全院调剂池 `GET /api/v1/teacher/reallocation-pool`

- 鉴权：导师
- 说明：仅在 `selection_round.adjust_start ~ adjust_end` 内开放；只返回未录取且勾选「服从跨室调剂」的学生
- **隐私约束**：只返回陈述摘要（前 80 字）与 `hasFullArchive` 标记，**不返回陈述全文**；全文读取必须走 3.40，且学生须在入池时勾选「同意全院导师查看完整档案」
- 查询参数：`keyword`、`pageNum`、`pageSize`
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 36,
    "pageNum": 1,
    "pageSize": 10,
    "myRemainQuota": 2,
    "list": [
      {
        "studentId": 1003,
        "studentNo": "2022****03",
        "studentName": "刘*婷",
        "college": "计算机学院",
        "major": "软件工程",
        "grade": "2022",
        "statementSummary": "我选择这个方向的原因是……（前 80 字）",
        "hasFullArchive": 1,
        "programmingLanguages": ["Java", "Python"],
        "weeklyHours": 12,
        "taken": 0
      }
    ]
  }
}
```

- `taken = 1` 表示已被他人录入，前端置灰并标注「已被 XX 实训室录入」

### 3.44 抢录池内学生 `POST /api/v1/teacher/reallocation-pool/{studentId}/take`

- 鉴权：导师
- 请求：`{ "reason": "string, 录入理由, 必填, 10-200字" }`
- 成功响应：`{ "code": 200, "message": "success", "data": { "admissionId": 903, "mentorId": 11 } }`
- 说明：先到先得，直接写入 `admission.status = 2`、`active_flag = 1`、`pending_type = NULL`，学生不再二次确认
- 失败响应：

```json
{ "code": 409001, "message": "该生已被人工智能实训室录入" }
{ "code": 400002, "message": "个人剩余名额不足" }
{ "code": 400005, "message": "该生本轮已有录取记录" }
{ "code": 400004, "message": "当前不在调剂时间窗内" }
```

### 3.45 补录直接录入 `POST /api/v1/teacher/supplement/direct-admit`

- 鉴权：导师
- 说明：补录轮免面试直接录入，需填写理由；首轮不可用
- 请求：

```json
{
  "roundId": "BIGINT, 补录轮次ID, 必填",
  "studentId": "BIGINT, 学生ID, 必填",
  "reason": "string, 直接录入理由, 必填"
}
```

- 成功响应：`{ "code": 200, "message": "success", "data": { "admissionId": 904, "status": 2 } }`
- 失败响应：

```json
{ "code": 400005, "message": "首轮不支持直接录入" }
{ "code": 400005, "message": "当前不在补录轮或已进入调剂阶段" }
{ "code": 400002, "message": "个人剩余名额不足" }
{ "code": 400005, "message": "该生本轮已有录取记录" }
{ "code": 400005, "message": "该生未将你列为补录意向" }
```

### 3.46 阶段内调整录取 `POST /api/v1/admin/admissions/{id}/adjust`

- 鉴权：管理员
- 请求：

```json
{
  "action": "string, CONFIRM 手动确认 / CANCEL 取消通过 / REASSIGN 改派 / ABANDON 置放弃, 必填",
  "targetMentorId": "BIGINT, REASSIGN 时必填",
  "reason": "string, 调整原因, 必填"
}
```

- 成功响应：`{ "code": 200, "message": "success", "data": { "id": 901, "status": 2, "mentorId": 12 } }`
- 说明：
  - `CONFIRM`：`status = 2`、`active_flag = 1`，写 `confirm_time`
  - `CANCEL`：`status = 4`、`active_flag = NULL`，释放名额但**不触发递补**（名额留给本轮补录）
  - `REASSIGN`：原导师 `quota_used - 1`，新导师条件更新 `+1`，更新 `mentor_id` 与 `lab_id`；**不改变名额总数，不触发递补**
  - `ABANDON`：`status = 4`、`active_flag = NULL`，释放名额并**触发递补**，标记学生本轮放弃
  - 所有动作写 `operation_log`，含前后值、原因、操作人；公示开始后禁止调用
- 失败响应：`{ "code": 400002, "message": "目标导师剩余名额不足" }`、`{ "code": 400005, "message": "批次已锁定或已进入公示，不可调整" }`

### 3.47 生成轮次快照 `POST /api/v1/admin/rounds/{id}/snapshot`

- 鉴权：管理员
- 请求：`{ "snapshotType": "TINYINT, 1拟录取名单 2确认结果 3调剂结果 4最终归档, 必填" }`
- 成功响应：`{ "code": 200, "message": "success", "data": { "id": 2001, "version": 2, "recordCount": 86 } }`
- 说明：**追加式写入**。同轮同类型重新生成时，旧记录 `is_current = 0`、新记录 `is_current = 1` 且 `version + 1`，历史不丢失。批次归档以 `is_current = 1` 且 `snapshotType = 4` 为唯一权威源。

### 3.47.1 快照历史 `GET /api/v1/admin/rounds/{id}/snapshots`

- 鉴权：管理员
- 路径参数：`id` 为 `selection_round.id`
- 查询参数：`snapshotType`（可选，1 拟录取 2 确认结果 3 调剂结果 4 最终归档）
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": 2001,
      "roundId": 930001,
      "roundName": "第一轮双选",
      "snapshotType": 4,
      "snapshotTypeText": "最终归档",
      "recordCount": 86,
      "version": 2,
      "isCurrent": 1,
      "operatorName": "管理员",
      "gmtCreate": "2026-11-07 00:00:00"
    }
  ]
}
```

- 排序：`gmt_create DESC, version DESC`
- 失败响应：`{ "code": 404001, "message": "选拔轮次不存在" }`

### 3.48 批次锁定 `POST /api/v1/admin/rounds/{id}/lock`

- 鉴权：管理员
- 请求：`{ "reason": "string, 锁定原因, 必填" }`
- **前置校验**：`snapshotType = 4` 的当前快照已存在；`publicity.status = 3` 已确认；本轮无 `status = 1` 待确认记录。任一不满足返回 400002。
- 成功响应：`{ "code": 200, "message": "success", "data": { "locked": 1, "lockedAt": "2026-11-07 00:00:00" } }`
- 说明：仅最后一轮可置 `locked = 1`；锁定后业务写接口返回 400005，但**快照生成、解锁、异议处理、入组确认不受限**

### 3.49 批次解锁 `POST /api/v1/admin/rounds/{id}/unlock`

- 鉴权：管理员
- 请求：`{ "reason": "string, 解锁原因, 必填", "confirmPassword": "string, 当前管理员密码, 必填" }`
- 成功响应：`{ "code": 200, "message": "success", "data": { "locked": 0, "unlockedAt": "2026-11-07 10:00:00" } }`
- 前置校验：`locked = 1` 且密码校验通过
- 副作用：`locked = 0`；相关公示批次 `publicity.status` 由 3 退回 1；强制重生成受影响快照；写 `operation_log` 并推送通知给院长/管理员组
- 失败响应：`{ "code": 401002, "message": "密码校验失败" }`、`{ "code": 400005, "message": "批次未锁定" }`

### 3.50 强制调整导师名额 `PUT /api/v1/admin/mentors/{id}/quota`

- 鉴权：管理员
- 路径参数：`id` 为 `mentor_profile.id`
- 说明：名额冻结（第 1 轮 `apply_start` 后）期间唯一可用的名额调整入口；不受冻结限制，但必须留痕并在学生端公告
- 请求：

```json
{ "quota": "INT, 新名额, 必填", "reason": "string, 强制调整理由, 必填" }
```

- 成功响应：`{ "code": 200, "message": "success", "data": { "id": 11, "quota": 5, "operationLogId": 3001, "noticeId": 4001 } }`
- 校验：`quota >= quota_used`（含拟录取占位与待确认）、`SUM(quota) <= lab.total_quota`
- 副作用：写 `operation_log`（`biz_type = QUOTA`，含前后值与理由）；插入 `notice`（`notice_type = 4` 通知、`status = 2`）并在学生端公告
- 失败响应：

```json
{ "code": 404001, "message": "导师不存在" }
{ "code": 400001, "message": "强制调整理由不能为空" }
{ "code": 400002, "message": "本室导师名额之和超出实训室总名额（20 人）" }
{ "code": 400002, "message": "新名额不得小于已占用名额（2 人，含待确认占位）" }
```

### 3.51 题库列表 `GET /api/v1/teacher/questions`

- 鉴权：导师
- 说明：仅返回当前导师本人题库，按 `id` 倒序
- 查询参数：`questionType`（可选，1–4）、`status`（可选，1 启用 0 停用）、`keyword`（可选，匹配题干）、`pageNum`、`pageSize`
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 12,
    "pageNum": 1,
    "pageSize": 10,
    "list": [
      {
        "id": 101,
        "questionType": 1,
        "questionTypeText": "单选题",
        "content": "以下哪个是 JVM 垃圾回收器？",
        "options": ["G1", "MySQL", "Redis", "Nginx"],
        "correctAnswer": "A",
        "score": 5.00,
        "status": 1,
        "statusText": "启用"
      }
    ]
  }
}
```

### 3.52 题库维护 `POST/PUT/DELETE /api/v1/teacher/questions`

- 鉴权：导师
- 新增：`POST /api/v1/teacher/questions`
- 修改：`PUT /api/v1/teacher/questions/{id}`
- 删除：`DELETE /api/v1/teacher/questions/{id}`
- 请求（新增与修改一致）：

```json
{
  "questionType": "TINYINT, 1单选 2多选 3判断 4填空, 必填",
  "content": "string, 题干, 必填, 最长 1000 字",
  "options": ["string, 选项文本, 单选/多选必填 2-8 个"],
  "correctAnswer": "string, 单选 A；多选 A,B；判断 T/F；填空多个答案用 | 分隔, 必填",
  "score": "DECIMAL, 默认分值 0.01-100, 必填"
}
```

- 成功响应：返回与列表项同构的题目对象；删除成功返回 `data = null`
- 说明：
  - 选项按数组顺序对应 A/B/C…，最多 8 个
  - 多选题正确答案至少 2 个，且必须全部落在选项范围内
  - 已被试卷引用的题目删除时置 `status = 0`（停用），未引用时物理删除
  - 批次 `locked = 1` 时写操作返回 400005
- 失败响应：

```json
{ "code": 400001, "message": "选择题选项数量须为 2-8 个" }
{ "code": 400001, "message": "多选题至少设置两个正确答案" }
{ "code": 403001, "message": "只能操作本人题库" }
{ "code": 400005, "message": "批次已锁定，不可修改在线笔试" }
```

### 3.53 试卷列表 `GET /api/v1/teacher/exam-papers`

- 鉴权：导师
- 查询参数：`roundId`（可选，缺省不限）、`status`（可选，1 草稿 2 已发布）、`keyword`（可选，匹配标题）、`pageNum`、`pageSize`
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 2,
    "pageNum": 1,
    "pageSize": 10,
    "list": [
      {
        "id": 900,
        "roundId": 1,
        "title": "2026 年实验室进组笔试",
        "status": 2,
        "statusText": "已发布",
        "questionCount": 20,
        "totalScore": 100.00,
        "startTime": "2026-11-12 09:00:00",
        "endTime": "2026-11-12 11:00:00",
        "durationMinutes": 60,
        "answerCount": 15,
        "submittedCount": 12,
        "averageScore": 76.50
      }
    ]
  }
}
```

- 说明：`answerCount` 为已开始答题人数，`submittedCount` 为已交卷人数，`averageScore` 仅统计已交卷答卷，无提交时返回 `null`

### 3.54 试卷详情与草稿维护 `GET/POST/PUT/DELETE /api/v1/teacher/exam-papers`

- 鉴权：导师
- 详情：`GET /api/v1/teacher/exam-papers/{id}`，返回题目与正确答案，供导师复核
- 新建：`POST /api/v1/teacher/exam-papers`
- 修改：`PUT /api/v1/teacher/exam-papers/{id}`，仅草稿可改
- 删除：`DELETE /api/v1/teacher/exam-papers/{id}`，仅草稿可删
- 请求（新建与修改一致）：

```json
{
  "roundId": "BIGINT, 轮次ID, 选填，缺省取当前轮",
  "title": "string, 试卷标题, 必填, 最长 200 字",
  "description": "string, 试卷说明, 选填, 最长 1000 字",
  "startTime": "yyyy-MM-dd HH:mm:ss, 答题开始, 必填",
  "endTime": "yyyy-MM-dd HH:mm:ss, 答题结束, 必填",
  "durationMinutes": "INT, 单次答题时长 1-300 分钟, 必填",
  "questions": [
    { "questionId": "BIGINT, 题库题目ID, 必填", "score": "DECIMAL, 本题分值 0.01-100, 必填" }
  ]
}
```

- 成功响应（详情）：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 900,
    "roundId": 1,
    "title": "2026 年实验室进组笔试",
    "description": "请在 60 分钟内完成",
    "startTime": "2026-11-12 09:00:00",
    "endTime": "2026-11-12 11:00:00",
    "durationMinutes": 60,
    "totalScore": 100.00,
    "status": 1,
    "statusText": "草稿",
    "questionCount": 20,
    "questions": [
      {
        "id": 5001,
        "questionId": 101,
        "questionNo": 1,
        "questionType": 1,
        "questionTypeText": "单选题",
        "content": "以下哪个是 JVM 垃圾回收器？",
        "options": ["G1", "MySQL", "Redis", "Nginx"],
        "correctAnswer": "A",
        "score": 5.00
      }
    ]
  }
}
```

- 校验：`endTime > startTime`；题目不得重复；只能选用本人启用状态题目；总分由题目分值自动汇总
- 失败响应：

```json
{ "code": 400001, "message": "答题结束时间必须晚于开始时间" }
{ "code": 400002, "message": "试卷中存在重复题目" }
{ "code": 403001, "message": "只能选用本人题库中的题目" }
{ "code": 400005, "message": "已发布试卷不可修改" }
```

### 3.55 发布试卷 `POST /api/v1/teacher/exam-papers/{id}/publish`

- 鉴权：导师
- 前置校验：试卷为草稿、至少 1 道题、`endTime > 当前时间`
- 成功响应：`{ "code": 200, "message": "success", "data": null }`
- 说明：发布后学生端按答题时间可见；试卷题目与时间窗不可再修改
- 失败响应：`{ "code": 400002, "message": "试卷至少包含一道题" }`、`{ "code": 400002, "message": "答题结束时间已过，无法发布" }`

### 3.56 试卷结果 `GET /api/v1/teacher/exam-papers/{id}/results`

- 鉴权：导师
- 说明：以本轮填报该导师且填报已提交的学生为应考名单，未开始答题的学生同样列出
- 查询参数：`status`（可选，0 未参加 1 答题中 2 已提交）、`pageNum`、`pageSize`
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 15,
    "pageNum": 1,
    "pageSize": 10,
    "list": [
      {
        "studentId": 1001,
        "studentNo": "2022****01",
        "studentName": "陈*丽",
        "startTime": "2026-11-12 09:01:00",
        "submitTime": "2026-11-12 09:52:00",
        "status": 2,
        "statusText": "已提交",
        "score": 85.00
      }
    ]
  }
}
```

- 排序：已提交优先按得分倒序，未提交按学生 ID 升序

### 3.57 我的在线笔试 `GET /api/v1/student/exams`

- 鉴权：学生
- 查询参数：`roundId`（可选，缺省取最近轮次）
- 说明：仅返回本人在该轮**已提交填报**中选择的导师所发布的试卷；无填报或无导师试卷时返回空数组
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "paperId": 900,
      "title": "2026 年实验室进组笔试",
      "mentorId": 11,
      "mentorName": "李海峰",
      "labName": "人工智能实训室",
      "startTime": "2026-11-12 09:00:00",
      "endTime": "2026-11-12 11:00:00",
      "durationMinutes": 60,
      "totalScore": 100.00,
      "paperStatusText": "进行中",
      "answerStatus": 1,
      "answerStatusText": "答题中",
      "myScore": null,
      "canStart": true
    }
  ]
}
```

- 说明：`paperStatusText` 按服务端当前时间派生「未开始 / 进行中 / 已结束」；`answerStatus = 0` 表示未参加；`myScore` 仅已交卷时返回

### 3.58 学生试卷详情 `GET /api/v1/student/exams/{paperId}`

- 鉴权：学生
- 前置校验：本人已选择该试卷导师且填报已提交，否则 403001；未开始返回 400004，已结束且未作答返回 400004
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "paperId": 900,
    "title": "2026 年实验室进组笔试",
    "description": "请在 60 分钟内完成",
    "mentorName": "李海峰",
    "labName": "人工智能实训室",
    "startTime": "2026-11-12 09:00:00",
    "endTime": "2026-11-12 11:00:00",
    "durationMinutes": 60,
    "totalScore": 100.00,
    "answerStatus": 1,
    "answerStatusText": "答题中",
    "remainingSeconds": 3200,
    "submittedTime": null,
    "myScore": null,
    "questions": [
      {
        "questionId": 101,
        "questionNo": 1,
        "questionType": 1,
        "questionTypeText": "单选题",
        "content": "以下哪个是 JVM 垃圾回收器？",
        "options": ["G1", "MySQL", "Redis", "Nginx"],
        "score": 5.00,
        "answerContent": "A"
      }
    ]
  }
}
```

- **安全约束**：学生端任何响应均不得包含 `correctAnswer`；`remainingSeconds` 以服务端时间计算，截止时间为 `min(endTime, startTime + durationMinutes)`

### 3.59 开始答题 `POST /api/v1/student/exams/{paperId}/start`

- 鉴权：学生
- 说明：同一学生同一试卷仅一份答卷；重复调用返回已有答卷，不重置开始时间
- 前置校验：试卷已发布、在答题时间窗内、本人已选择该导师；批次锁定返回 400005
- 成功响应：与 §3.58 详情结构一致，`answerStatus = 1`，`remainingSeconds` 为本次剩余秒数
- 失败响应：

```json
{ "code": 400004, "message": "当前不在答题时间窗内" }
{ "code": 403001, "message": "未选择该导师，无法参加本场笔试" }
{ "code": 400005, "message": "试卷未发布" }
```

### 3.60 暂存作答 `PUT /api/v1/student/exams/{paperId}/answers`

- 鉴权：学生
- 请求：

```json
{
  "items": [
    { "questionId": "BIGINT, 题目ID, 必填", "answerContent": "string, 作答内容, 最长 2000 字" }
  ]
}
```

- 成功响应：

```json
{ "code": 200, "message": "success", "data": { "savedCount": 20, "answerStatus": 1, "remainingSeconds": 3000 } }
```

- 说明：全量覆盖暂存；题目必须属于本试卷；答卷已提交返回 400005；超过答题截止时服务端自动交卷，返回 `answerStatus = 2`、`remainingSeconds = 0`
- 失败响应：`{ "code": 400005, "message": "请先开始答题" }`、`{ "code": 400002, "message": "题目不属于本试卷" }`

### 3.61 交卷 `POST /api/v1/student/exams/{paperId}/submit`

- 鉴权：学生
- 说明：交卷后立即按客观题自动判分，答卷不可再修改；重复调用返回同一结果
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "answerId": 55,
    "objectiveScore": 85.00,
    "totalScore": 85.00,
    "totalScoreOfPaper": 100.00,
    "correctCount": 17,
    "questionCount": 20,
    "submitTime": "2026-11-12 09:52:00"
  }
}
```

- 判分规则：单选 / 判断精确匹配；多选按集合匹配、与顺序无关；填空命中 `|` 分隔的任一答案即得分（忽略大小写与首尾空格）；未作答不得分
- 失败响应：`{ "code": 400005, "message": "请先开始答题" }`、`{ "code": 400005, "message": "批次已锁定，不可修改在线笔试" }`

### 3.62 公告附件上传 `POST /api/v1/admin/notices/upload`

- 鉴权：管理员
- 请求：`multipart/form-data`，字段 `file`
- 限制：单文件不超过 10MB；扩展名仅限 `pdf / doc / docx / xls / xlsx / ppt / pptx / zip / rar / png / jpg / jpeg`
- 存储：服务端按 `notice/yyyyMMdd/uuid.ext` 落盘，附件通过 `GET /api/v1/files/**` 免登录访问
- 成功响应：

```json
{ "code": 200, "message": "success", "data": { "fileName": "选拔方案.pdf", "url": "/api/v1/files/notice/20261111/8f3c2a1b9d4e4f6c8a7b5d3e1f0a2b4c.pdf" } }
```

- 失败响应：`{ "code": 400001, "message": "请选择需要上传的附件" }`、`{ "code": 400001, "message": "附件大小不能超过 10MB" }`、`{ "code": 400001, "message": "不支持的附件类型" }`

### 3.63 删除公告 `DELETE /api/v1/admin/notices/{id}`

- 鉴权：管理员
- 说明：仅草稿（`status = 1`）与已下线（`status = 3`）公告可删除；已发布公告须先下线；删除成功后同步清理本系统存储的附件文件
- 成功响应：`{ "code": 200, "message": "success", "data": null }`
- 失败响应：`{ "code": 404001, "message": "公告不存在" }`、`{ "code": 400005, "message": "已发布公告请先下线再删除" }`

## 4. QA 交叉审查结论

| 类型 | 问题 | 处理 |
|---|---|---|
| 查漏 | 补录阶段需要「剩余名额导师」列表，原设计仅有全量导师接口 | 已补 `GET /student/supplement/mentors` |
| 查漏 | 学生工作台需要轮次倒计时与待办聚合，逐个接口调用会造成首屏 5+ 请求 | 已补 `GET /student/dashboard` 聚合接口 |
| 查漏 | 负责人缺少本室名单汇总提交动作 | 已补 `POST /leader/nominations/submit`；提交仅汇总，不生成 `admission`，统一由批次签发 |
| 查漏 | 公示名单需按「本人完整、他人脱敏」差异化返回 | 已在 `GET /student/publicity/{id}` 响应中约定 `isSelf` 与脱敏规则 |
| 查冗 | 原草稿含「学生自助注册」「教师注册审核」「导师审核通过/驳回」共 4 个接口 | 账号改为学校统一创建，已全部删除 |
| 查冗 | 原草稿含「学生线上自选剩余名额」接口 | 需求明确不做，已删除 |
| 查漏 | 导师在面试前无法了解学生背景，评分缺少依据 | 已补 `GET/PUT /student/archive` 与 `GET /teacher/students/{id}/archive` |
| 查漏 | 四处待确认（拟录取多选一、递补、异议调整、内部调剂）原为多套逻辑 | 已抽出 `GET /student/confirm-center` + `POST /student/confirm-center/{id}/respond`，按 `status = 1` 检索，`pending_type` 仅作展示 |
| 查漏 | 管理员缺少阶段内兜底能力，学生说「没点上」时只能改库 | 已补 `POST /admin/admissions/{id}/adjust`，四种动作均强制填原因并留痕 |
| 查漏 | 跨室调剂原为管理员单点分配，教师无参与 | 已补 `GET /teacher/reallocation-pool` 与 `POST .../take`，先到先得，管理员保留兜底 |
| 查漏 | 补录轮时间紧，强制走面试会跑不完 | 已补 `POST /teacher/supplement/direct-admit`，需填理由 |
| 查漏 | 补录两轮名单会互相覆盖，无法回溯 | 已补 `POST /admin/rounds/{id}/snapshot` 与 `round_snapshot` 表 |
| 查漏 | 批次结束后数据仍可改，归档不严肃 | 已补 `POST /admin/rounds/{id}/lock`，锁定后全系统只读 |
| 查漏 | 导师「我的拟录取列表」「我的录取名单」「发送提醒」仅有总表条目、无字段契约 | 已补 §3.20.1 / §3.20.2 / §3.20.3 |
| 越权风险 | 学生确认/放弃录取可传任意 `admissionId` | 服务端校验 `admission.student_id = 当前登录用户`，否则 403001 |
| 越权风险 | 导师查看评分可传其他实训室 `studentId` | 校验该学生在本室存在评分记录且导师属于该实训室 |
| 越权风险 | 导师拟录取可勾选非本人意向学生 | 提交时校验每个学生均在本人 `nomination` 候选中 |
| 越权风险 | 负责人调整名额/排期可操作其他实训室数据 | 所有 `/leader/**` 接口强制校验 `lab.leader_id = 当前用户` |
| 越权风险 | 管理员接口被普通用户访问 | `/admin/**` 前缀统一鉴权，校验 `user_type = 3` |
| 越权风险 | 名额被前端传参篡改 | 名额一律服务端条件更新，前端只提交学生列表 |
| 状态越权 | 非填报时间窗仍可提交志愿 | 每个写接口校验 `selection_round` 对应时间窗与状态 |
| 数据一致性 | 拟录取提交与名额占用非原子操作 | 事务内条件更新 `quota_used`，失败即回滚 |
