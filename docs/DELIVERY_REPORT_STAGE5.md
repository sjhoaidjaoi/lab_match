# 第五阶段交付报告：线上面试与四端选拔业务深度联动

- 分支：`feature/workspaces-and-college-pages`
- 提交：`ae2eb8b feat(interview): 线上面试与四端选拔业务深度联动（第五阶段）`
- 前置审查结论：第五阶段需求依赖的前四阶段成果（评分系统、AI 纪要、面试档案）在上一会话已完成但**未提交**，本次已随审查一并固化入库。

---

## 一、审查结论（先审后做，不假设）

按需求第二章要求，逐项核对了 README、需求文档、API、数据库、八阶段定义、四端路由、后端接口、LiveKit/AI 代码、录取调剂逻辑。**核心发现：第五阶段要求的绝大部分能力在前四阶段已经实现并通过测试**，无需重造轮子。真正的缺口只有一处——测试脚本的时序 bug。

## 二、本次实际完成的改动

### 2.1 修复测试脚本 bug（真实缺陷）

`backend/tests/api.smoke.js` 中 `openStage(8)` 因阶段顺序校验静默失败，导致第 8 阶段从未真正打开，7 项测试误报「结果公示与正式入组阶段未开放」。

- **根因**：`batches.js` 的 PUT 阶段接口有「开始时间不得早于上一阶段开始时间」校验（`backend/routes/batches.js` 第 142–156 行）。测试从第 6 阶段直接跳到第 8 阶段，跳过了第 7 阶段（学院统筹调剂），第 8 阶段 startTime（now−60s）早于第 7 阶段未动的未来 startTime，PUT 被 400 拒绝，第 8 阶段未打开。
- **修复**：`openStage(8)` 前先 `await openStage(7)` 推进第 7 阶段时间窗。
- **结果**：冒烟测试从 98 通过 / 7 失败 → **105 通过 / 0 失败**。

### 2.2 固化上一会话未提交的成果

上一会话完成了第五阶段核心代码但未提交，本次审查确认其完整、测试全绿后一并提交（48 个文件，含 `interviewAi.js`、`interviewSelection.js`、`migration_v11.sql`、`migration_v12.sql` 等）。

## 三、需求 12 项任务完成情况对照

| 任务 | 需求要点 | 实现位置 | 状态 |
| --- | --- | --- | --- |
| 任务一 统一面试与报名 | 面试绑定报名记录（批次/志愿/学生/实训室/场次/面试官/状态） | `interviews.js` `preferenceId` + `interviewSelection.js` `linkedChoice`/`scopedChoice` | ✅ 已实现 |
| 任务二 学生面试 | 九种预约状态 + 邀请确认 + 本人可见 | `interviewSelection.js` `appointmentStatus`（UNSCHEDULED/SCHEDULED/WAITING/IN_PROGRESS/COMPLETED/CANCELLED/MISSED/UNHELD/RESCHEDULED）+ `/interviews/my` + `/acknowledge` | ✅ 已实现 |
| 任务三 评分评价 | 五维评分/权重/多面试官独立评分/草稿/历史 | `interviews.js` `/score` + `interviewEvaluations` 表 + `interviewScorePolicies` + `canEvaluate`（HOST/PANEL 独立） | ✅ 已实现 |
| 任务四 组长汇总筛选 | 报名/面试进度/评分汇总/筛选/内部调剂 | `interviews.js` `/selection-progress` + `recruitmentReviews` + `LeaderStudentSummary.vue` | ✅ 已实现 |
| 任务五 学院联动 | 面试进度/追溯/跨室调剂/最终名单 | `interviews.js` `/all` `/overview` + `adjustments.js` `/cross` + `final.js` | ✅ 已实现 |
| 任务六 八阶段联动 | 时间窗控制/批次停止/防绕过 | `recruitment.js` `stageOpen`/`batchWritableError` + `interviewVideo.js` `roomStatus`→`scheduledEnd`→`stageOpen`→`isBatchStopped` | ✅ 已实现 |
| 任务七 名额一致性 | 防超额/防重复录取/面试≠录取 | `mentorCapacity.js` + `admissions.js` + `adjustments.js` + `final.js` | ✅ 已实现 |
| 任务八 异常处理 | 缺席/取消/改期/网络/录制失败/未评价 | `interviews.js` `/exception` + `retryOf` 补面试 + `selection-progress` 异常统计 | ✅ 已实现 |
| 任务九 数据模型 | 主键关联/录像·逐字稿·纪要附属场次 | `migration_v11/v12.sql` + `interviewEvaluations`/`interviewScorePolicies` 表 | ✅ 已实现 |
| 任务十 通知待办 | 四端待办 + 关联真实业务 + 跳转 | `notifications.js` `destination` 字段 + `CollegeDashboard.vue` 待办块 + 各端统计卡 | ✅ 已实现 |
| 任务十一 UI 统一 | 橙白风格/复用组件/加载空态/确认弹窗 | 各视图已按现有设计规范 | ✅ 已实现 |
| 任务十二 权限安全 | 学生/教师/组长/学院边界 + 审计日志 | `auth.js` RBAC + `guardLab` + `logOperation` | ✅ 已实现 |

## 四、面试评分与汇总规则

- **评分维度**：学习态度 / 逻辑思维 / 编程基础 / 时间投入 / 综合表现（沿用现有标准，符合「优先使用已有标准」要求）。
- **权重**：学院按批次配置（`POST /api/interviews/score-policy`），五项权重之和必须为 100；已存在正式评价的批次锁定规则。
- **总分**：后端 `weighted()` 按权重计算，前端不单独算分。
- **多面试官**：每位面试官独立评分存 `interviewEvaluations`（`reviewerId` + `version`），只能改自己的；主持人可邀请同室教师（PANEL）共同评分。
- **汇总**：`evaluationSummary` 支持 MEAN/MEDIAN 聚合；评分差异超过 `reviewThreshold` 时标记「需复核」，不自动认定某位教师无效。

## 五、八阶段业务联动

- 面试绑定第四阶段（导师初选与面试）；`stageOpen(store, batchId, 4)` 实时按时间窗判定。
- 批次停止/结束 → `batchWritableError` 拦截所有写操作；`stageOpen` 内部 `isBatchStopped` 直接返回 false。
- 线上面试 token 签发链路：`/token` → `roomStatus` → `scheduledEnd` → `stageOpen` → `isBatchStopped`，批次停止或第 4 阶段关闭即返回 CLOSED，旧凭证无法加入。
- 学院调整阶段时间后，前端每 30 秒同步一次，四端状态实时变化。

## 六、录取名额与数据一致性保障

- 名额取 `labYearlyPlans`/`teacherYearlyQuotas`（按学年），回落 `lab.recruitmentQuota`/`teacher.recruitmentQuota`。
- 防超额：`mentorCapacityError` + `occupiedAdmissionStudents`（学生去重计数），正式录取前校验实训室总名额 + 导师个人名额。
- 防重复录取：`validateAdjustment` 检查已确认拟录取/已确认调剂/最终录取；`final.js` 合并时校验重复去向与超额。
- 面试≠录取：`teacherPasses` 要求 `interviewStatus === 'COMPLETED' && recommendation === 'INTENDED'` 才进入邀请候选。

## 七、权限与安全核验

- 学生只能看本人面试（`/interviews/my` 按 `studentId === req.user.uid`）。
- 教师只能评有权限学生（`canEvaluate` 校验实训室 + 志愿归属 + 主持人/PANEL 身份）。
- 教师不能改他人评分（`/score` 只写 `reviewerId === req.user.uid` 的 `interviewEvaluations`）。
- 组长只能管理本室（`guardLab` + `isLabLeader`）。
- 学院仅执行学院级操作；敏感档案访问 `interviewArchive` 有日志记录。
- 已停用账号 → `requireAuth` 返回 403；已停止批次 → `batchWritableError` 409。

## 八、自动化测试结果

| 套件 | 结果 |
| --- | --- |
| `npm test`（冒烟） | 通过 105，失败 0 |
| `npm run test:flow`（流程） | 通过 41，失败 0 |
| `npm run test:profile`（资料） | 通过 50，失败 0 |
| `npm run test:video`（线上面试） | PASS |
| `npm run test:recording`（录制档案） | PASS |
| `npm run test:interview-ai`（AI 纪要） | PASS |
| `frontend npx vue-tsc --noEmit` | 无错误 |

## 九、未完成 / 需说明事项

1. **前四阶段成果本次才入库**：上一会话完成了评分系统、AI 纪要、面试档案等核心代码但未提交，本次审查确认完整后随 `ae2eb8b` 一并提交。这部分不是本次新写，但属第五阶段依赖。
2. **MySQL 迁移未实测**：`migration_v11.sql`/`migration_v12.sql` 已注册，本机无 MySQL 实例，仅做语法检查；文件存储路径全部实测。
3. **LiveKit / DeepSeek / S3 真机验收依赖外部配置**：线上面试、AI 纪要与录制回放的真实端到端验收需 LiveKit Cloud、DeepSeek API Key、私有 S3 桶与学校授权，本环境未配置，仅完成隔离测试。
4. **PR 未创建**：`main` 有分支保护，本机无 `gh` CLI，需手动在 GitHub 创建。

## 十、第六阶段验收准备情况

- 核心业务闭环已就绪：报名 → 面试 → 评分 → 拟录取 → 确认 → 调剂 → 最终名单 → 公示 → 入组。
- 全部自动化测试绿，可进入第六阶段。
- 建议第六阶段前补齐：真实 MySQL 迁移验证、LiveKit/AI/S3 真机联调、真机设备多端验收。
