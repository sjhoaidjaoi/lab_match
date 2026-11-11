# 实验室负责人模块

从 `d:\elect-project` 中提取的实验室负责人（实训室负责人 / LAB_LEADER）模块代码，保留原项目目录结构，便于单独提交、评审或合并回主项目。

- 来源分支：`feature/lab-leader`
- 来源提交：`1be964e`
- 提取范围：负责人端后端接口、服务、DTO/VO、单元测试、前端页面、API、类型、接口契约、数据库说明与流程文档
- 文件数量：69（含 README 与模块文档）

## 目录结构

```text
lab-leader-module/
├── backend/
│   └── src/
│       ├── main/java/com/college/labselect/
│       │   ├── controller/leader/       负责人端 7 个控制器
│       │   ├── service/                 面试场次/排期/评分/拟录取服务接口
│       │   ├── service/impl/            对应服务实现
│       │   └── dto/req|resp/            负责人相关请求与响应对象
│       └── test/java/.../service/       面试与拟录取单元测试
├── frontend/
│   └── src/
│       ├── pages/teacher/               负责人端 5 个页面
│       ├── components/                  场次表单、评分表单弹窗
│       ├── api/                         负责人接口封装
│       └── types/                       接口与页面类型
└── docs-framework/
    ├── 04_API-负责人模块.md            负责人接口契约
    ├── 03_Database-负责人相关表.md     相关表结构与 DDL
    └── flow/                          4 份负责人相关流程
```

## 模块文档

- `docs-framework/04_API-负责人模块.md`：全局约定、错误码、18 个接口总览与请求/响应/失败码详述
- `docs-framework/03_Database-负责人相关表.md`：15 张相关表的字段说明与建表 DDL
- `docs-framework/flow/`：面试排期与评分、拟录取与确认、统筹调剂、基础配置与账号管理（负责人相关部分）

## 负责人专属文件

### 后端

- 控制器：`LeaderDashboardController`、`LeaderMentorController`、`LeaderInterviewSessionController`、`LeaderInterviewScheduleController`、`LeaderScoreController`、`LeaderNominationController`、`LeaderReallocationController`
- 服务接口：`IInterviewSessionService`、`IInterviewScheduleService`、`IInterviewScoreService`、`ILeaderNominationService`
- 服务实现：`InterviewSessionServiceImpl`、`InterviewScheduleServiceImpl`、`InterviewScoreServiceImpl`、`LeaderNominationServiceImpl`
- 单元测试：`InterviewSessionServiceTest`、`InterviewScheduleServiceTest`、`InterviewScoreServiceTest`、`LeaderNominationServiceTest`

### 前端

- 页面：`LeaderDashboardPage`、`LeaderInterviewSchedulePage`、`LeaderScoringPage`、`LeaderNominationPage`、`LeaderReallocationPage`
- 弹窗组件：`SessionFormDialog`、`ScoreFormDialog`
- API：`leaderInterview.ts`、`leaderMentor.ts`、`leaderScore.ts`、`leaderNomination.ts`、`leaderReallocation.ts`
- 类型：`interview.ts`、`nomination.ts`、`reallocation.ts`

## 公共依赖（未复制，集成时使用主项目现有实现）

### 后端

- 公共响应与工具：`Result`、`PageResult`、`ResultCode`、`BusinessException`、`GlobalExceptionHandler`、`StatusTextUtils`、`DesensitizeUtils`、`InterviewTimeUtils`
- 安全与配置：`SecurityConfig`、`JwtAuthenticationFilter`、`LoginUser`
- 实体与 Mapper：`SysUser`、`Lab`、`MentorProfile`、`SelectionRound`、`Intention`、`IntentionItem`、`InterviewSession`、`InterviewSessionInterviewer`、`InterviewSchedule`、`InterviewScore`、`Nomination`、`Reallocation`、`Admission`、`UserNotice`、`OperationLog`
- 共用服务：`DashboardServiceImpl`（负责人工作台聚合）、`ReallocationServiceImpl`（本室内部调剂）、`MentorServiceImpl`（本室导师与名额调整）、`LabServiceImpl`
- 共用接口：`IDashboardService`、`IReallocationService`、`IMentorService`
- 共用 DTO：`MentorListVO`、`MentorStatusReqDTO` 等

### 前端

- 请求层：`src/api/request.ts`
- 布局与路由：`src/layouts/TeacherLayout.vue`、`src/router/index.ts` 中 `/leader` 路由块
- 登录态：`src/store/user.ts`
- 本文件夹中标记为公共的文件：`api/dashboard.ts`、`api/public.ts`、`types/dashboard.ts`、`types/basic.ts`、`types/student.ts`

## 后台接口清单（18 个）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/v1/leader/dashboard | 本室工作台 |
| GET | /api/v1/leader/mentors | 本室导师与名额 |
| PUT | /api/v1/leader/mentors/{id}/quota | 调整导师名额 |
| GET | /api/v1/leader/interview-sessions | 场次列表 |
| POST | /api/v1/leader/interview-sessions | 新增场次 |
| PUT | /api/v1/leader/interview-sessions/{id} | 修改场次 |
| DELETE | /api/v1/leader/interview-sessions/{id} | 删除场次 |
| POST | /api/v1/leader/interview-sessions/publish | 发布排期 |
| GET | /api/v1/leader/interview-schedules | 排期列表 |
| POST | /api/v1/leader/interview-schedules/auto | 自动分配 |
| PUT | /api/v1/leader/interview-schedules | 手工调整排期 |
| GET | /api/v1/leader/scores | 本室评分列表 |
| POST | /api/v1/leader/scores | 录入/更新评分 |
| POST | /api/v1/leader/scores/import | Excel 批量导入评分 |
| GET | /api/v1/leader/nominations | 本室拟录取汇总 |
| POST | /api/v1/leader/nominations/submit | 提交本室名单 |
| GET | /api/v1/leader/reallocation/candidates | 本室调剂候选 |
| POST | /api/v1/leader/reallocation | 执行本室内部调剂 |

接口契约见本模块 `docs-framework/04_API-负责人模块.md`，内容与主项目 `docs-framework/04_API.md` 同步。

## 前端路由

| 路径 | 页面 |
|---|---|
| /leader | 本室工作台 |
| /leader/interview-schedule | 面试排期 |
| /leader/scoring | 本室评分录入 |
| /leader/nominations | 本室录取汇总 |
| /leader/reallocation | 本室内部调剂 |

## 涉及数据表

`selection_round`、`lab`、`mentor_profile`、`sys_user`、`intention`、`intention_item`、`interview_session`、`interview_session_interviewer`、`interview_schedule`、`interview_score`、`nomination`、`admission`、`reallocation`、`user_notice`、`operation_log`。

## 集成方式

1. 将 `backend/src` 下文件按原路径复制回主项目后端。
2. 将 `frontend/src` 下文件按原路径复制回主项目前端。
3. 确认主项目的公共依赖、`/leader` 路由、`TeacherLayout` 菜单已存在。
4. 后端执行 `mvn compile` 与 `mvn test`；前端执行 `pnpm build`。
5. 数据库表结构以本模块 `docs-framework/03_Database-负责人相关表.md` 为准，完整库结构参考主项目 `docs-framework/03_Database.md`。

## 关键约束

- 场次接口中的 `interviewerIds` 是 `sys_user.id`，不是 `mentor_profile.id`。
- 只有草稿场次可以修改、删除或作为排期调整目标；已发布场次返回 400005。
- 排期手工调整会校验学生时间冲突（409001）与场次容量（400002）。
- 评分导入仅支持 `.xlsx`，列顺序：学号、学习态度、逻辑思维、编程基础、时间投入、评语。
- 分数与金额以 JSON 数字返回，保留两位小数。
- 拟录取汇总的状态文案：1 待提交、2 已提交、0 未提交；已勾选数量包含草稿与已提交。
