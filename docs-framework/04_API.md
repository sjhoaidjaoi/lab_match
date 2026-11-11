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
- 金额/分数：字符串化的两位小数，如 `"85.50"`
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
| GET | /api/v1/teacher/scores/{studentId} | 查看某学生本室评分（只读） | 导师 |
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
| GET | /api/v1/leader/interview-schedules | 排期列表 | 负责人 |
| POST | /api/v1/leader/interview-schedules/auto | 自动分配 | 负责人 |
| PUT | /api/v1/leader/interview-schedules | 手工调整排期 | 负责人 |
| POST | /api/v1/leader/interview-sessions/publish | 发布排期 | 负责人 |
| GET | /api/v1/leader/scores | 本室评分列表 | 负责人 |
| POST | /api/v1/leader/scores | 录入/更新评分 | 负责人 |
| POST | /api/v1/leader/scores/import | Excel 批量导入评分 | 负责人 |
| GET | /api/v1/leader/nominations | 本室拟录取汇总 | 负责人 |
| POST | /api/v1/leader/nominations/submit | 提交本室名单至学院 | 负责人 |
| GET | /api/v1/leader/reallocation/candidates | 本室内部调剂候选 | 负责人 |
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
| POST | /api/v1/admin/rounds/{id}/lock | 批次锁定 | 管理员 |
| POST | /api/v1/admin/rounds/{id}/unlock | 批次解锁（需密码二次验证） | 管理员 |
| GET | /api/v1/admin/quotas/export | 导出名额 Excel | 管理员 |
| GET | /api/v1/admin/reallocation/candidates | 三级调剂候选 | 管理员 |
| POST | /api/v1/admin/reallocation | 执行调剂（支持批量） | 管理员 |
| GET | /api/v1/admin/publicities | 公示批次列表 | 管理员 |
| POST | /api/v1/admin/publicities | 发起公示 | 管理员 |
| PUT | /api/v1/admin/publicities/{id}/end | 结束公示 | 管理员 |
| POST | /api/v1/admin/publicities/{id}/confirm | 确认最终名单 | 管理员 |
| GET | /api/v1/admin/disputes | 异议工单列表 | 管理员 |
| PUT | /api/v1/admin/disputes/{id}/handle | 处理异议 | 管理员 |
| GET | /api/v1/admin/results | 全院录取总览（归档后从 type=4 快照渲染） | 管理员 |
| GET | /api/v1/admin/results/export | 导出录取 Excel（归档后从 type=4 快照渲染） | 管理员 |

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
- 查询参数：`keyword`（可选）、`collegeId`（可选）、`status`（可选，1 招录中 0 已满）、`pageNum`、`pageSize`
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
    "adjustStart": "2026-11-06 08:00:00",
    "adjustEnd": "2026-11-06 12:00:00",
    "locked": 0,
    "serverTime": "2026-11-02 09:15:00",
    "countdownSeconds": 9900
  }
}
```

- `phase`：`APPLY` / `INTERVIEW` / `NOMINATION` / `CONFIRM` / `ADJUST` / `PUBLICITY` / `LOCKED` / `IDLE`，前端据此展示横幅与门禁
- `locked = 1` 时前端整站只读

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
        "totalScore": "85.75",
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
- 前置校验：该学生必须在本室有评分记录，且导师属于该实训室
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1001,
    "studentId": 1001,
    "studentNo": "2022****01",
    "studentName": "陈*丽",
    "attitudeScore": "90.00",
    "logicScore": "85.00",
    "programmingScore": "88.00",
    "timeScore": "80.00",
    "systemTotal": "85.75",
    "manualTotal": null,
    "finalTotal": "85.75",
    "adjustReason": null,
    "comment": "基础扎实，项目经历丰富",
    "status": 2
  }
}
```

- 失败响应：`{ "code": 403001, "message": "无权查看该学生评分" }`

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
      "totalScore": "85.75",
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
      "totalScore": "82.00",
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
- **盲选门禁**：`NOW() < 当前轮 apply_end` 时 `applicantCount = 0`；填报截止后仅返回本室聚合数量，不提供名单下钻与任何学生标识
- 成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "round": { "roundNo": 1, "status": 3, "statusText": "面试中" },
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

### 3.24 调整导师名额 `PUT /api/v1/leader/mentors/{id}/quota`

- 鉴权：负责人
- 路径参数：`id` 为 `mentor_profile.id`
- **冻结校验**：`NOW() >= 第 1 轮 apply_start` 后返回 400004，强制调整只能走 3.50
- 请求：

```json
{ "quota": "INT, 新名额, 必填", "reason": "string, 调整理由, 必填" }
```

- 成功响应：`{ "code": 200, "message": "success", "data": { "id": 11, "quota": 5, "labTotalQuota": 20, "labQuotaSum": 20 } }`
- 失败响应：

```json
{ "code": 403001, "message": "该导师不属于本实训室" }
{ "code": 400002, "message": "本室导师名额之和超出实训室总名额（20 人）" }
{ "code": 400002, "message": "新名额不得小于已占用名额（2 人，含待确认占位）" }
{ "code": 400004, "message": "名额已冻结，请走管理员强制调整" }
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
- 成功响应：`{ "code": 200, "message": "success", "data": { "id": 701, "status": 1 } }`
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
{ "code": 400002, "message": "场次超出容量" }
```

### 3.27 录入评分 `POST /api/v1/leader/scores`

- 鉴权：负责人
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
    "systemTotal": "85.75",
    "manualTotal": "88.00",
    "finalTotal": "88.00",
    "status": 2
  }
}
```

- 失败响应：

```json
{ "code": 400001, "message": "分数必须在 0-100 之间" }
{ "code": 400001, "message": "手动调整总分时必须填写理由" }
{ "code": 403001, "message": "该学生未在本室面试" }
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

### 3.29 提交本室名单 `POST /api/v1/leader/nominations/submit`

- 鉴权：负责人
- 请求：`{ "roundId": "BIGINT, 轮次ID, 必填" }`
- 成功响应：`{ "code": 200, "message": "success", "data": { "admissionCount": 8, "conflictCount": 0 } }`（`admissionCount` 为本室拟录取条数，待批次签发，不代表已生成 `admission`）
- 副作用：标记本室名单已汇总，**不生成 `admission`、不推送录取结果**；`admission` 统一由 `nomination_submit_end` 批次按学生维度签发（BR-P5-02 / BR-P5-03）

### 3.30 本室内部调剂 `POST /api/v1/leader/reallocation`

- 鉴权：负责人
- 请求：

```json
{
  "roundId": "BIGINT, 轮次ID, 必填",
  "studentId": "BIGINT, 学生ID, 必填",
  "toMentorId": "BIGINT, 目标导师ID, 必填",
  "reason": "string, 调剂说明, 可选"
}
```

- 成功响应：`{ "code": 200, "message": "success", "data": { "reallocationId": 1401, "admissionId": 902 } }`
- 失败响应：

```json
{ "code": 400002, "message": "学生未勾选服从实训室内部调剂" }
{ "code": 400002, "message": "目标导师剩余名额不足" }
{ "code": 400005, "message": "学生本轮已有录取记录" }
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
        "totalScore": "78.00",
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
    "gpa": "3.72",
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
- 门禁：`type = 1` 需 `NOW() >= confirm_start`；`type ∈ {2,3}` 按记录自身 `created_at ~ confirm_deadline` 判定；公示开始后中心只读
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
        "totalScore": "85.75",
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
        "totalScore": "82.00",
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
| 查漏 | 三处待确认（拟录取多选一、递补、异议调整）原为三套逻辑 | 已抽出 `GET /student/confirm-center` + `POST /student/confirm-center/{id}/respond`，按 `status = 1` 检索，`pending_type` 仅作展示 |
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
