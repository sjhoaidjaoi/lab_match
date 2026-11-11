# 04 API｜实验室负责人模块

> 本文件从主项目 `docs-framework/04_API.md` 提取负责人模块契约，便于独立评审与交付。
> 字段名与状态值以本模块 `03_Database-负责人相关表.md` 为唯一基准，本文档不得自造枚举。

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

## 2. 负责人端接口总览

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


## 3. 接口详述

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

- 说明：按面试日期、开始时间升序返回；学号与姓名统一脱敏
- 失败响应：`{ "code": 403001, "message": "仅实训室负责人可操作面试排期" }`

### 3.25.3 自动分配排期 `POST /api/v1/leader/interview-schedules/auto`

- 鉴权：负责人
- 请求：`{ "roundId": "BIGINT, 轮次ID, 必填" }`
- 分配逻辑：
  - 仅使用本室本轮 `status = 1` 的草稿场次
  - 按意向导师聚合已提交意向（`intention.status = 2`）的本室学生
  - 优先分配到包含其意向导师的场次，并校验剩余容量
  - 已存在排期的学生跳过，不重复分配
- 成功响应：`{ "code": 200, "message": "success", "data": null }`
- 失败响应：

```json
{ "code": 404001, "message": "选拔轮次不存在" }
{ "code": 403001, "message": "仅实训室负责人可操作面试排期" }
{ "code": 400002, "message": "请先创建面试场次" }
{ "code": 400002, "message": "场次容量不足，无法完成自动分配" }
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
{ "code": 409001, "message": "存在学生时间冲突" }
{ "code": 400002, "message": "场次超出容量" }
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
{ "code": 403001, "message": "该学生未在本室面试" }
```

### 3.27.1 本室评分列表 `GET /api/v1/leader/scores`

- 鉴权：负责人
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

- 说明：列表以本室本轮排期学生为基准，按学号升序返回；`status = 0` 时 `id` 与各项评分字段均为 `null`，`statusText = "未评分"`
- 失败响应：`{ "code": 403001, "message": "仅实训室负责人可录入评分" }`

### 3.27.2 Excel 批量导入评分 `POST /api/v1/leader/scores/import`

- 鉴权：负责人
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
  - 使用最近轮次；仅处理本室已排期学生
  - 通过校验的行统一按 `submit = 1` 提交
  - 失败行跳过并记录日志；全部失败时返回 400002
- 成功响应：`{ "code": 200, "message": "success", "data": null }`
- 失败响应：

```json
{ "code": 400001, "message": "仅支持 .xlsx 格式文件" }
{ "code": 400001, "message": "Excel 无有效数据" }
{ "code": 404001, "message": "当前无选拔轮次" }
{ "code": 400002, "message": "评分导入全部失败，请检查学号、分数与排期" }
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
{ "code": 400004, "message": "当前不在调剂时间窗内" }
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

