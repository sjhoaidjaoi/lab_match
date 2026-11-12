# 大纲对照与优化路线（ROADMAP）

> 本文件保留“当初的判断”，部分条目已落地。**当前缺陷状态以 `docs/ISSUE_LEDGER.md` 为准。**

> 依据：`docs/REQUIREMENTS.md` + 桌面流程图。
> 范围：教师端 / 组长端为主，同时列出**给公共、学生端、学院端预留**的接口与数据。
> 结论：教师/组长条款已全覆盖；下一步的优化集中在“批次、多室授权、规则可配、跨端依赖”。

---

## 1. 教师 / 组长：大纲条款覆盖

| 大纲条款 | 状态 | 实现位置 |
|---|---|---|
| 查看本室信息、按授权编辑介绍 | ✅ | `teacher/lab/LabInfo.vue` |
| 报名名单、学生志愿意愿、导出 | ✅ | `teacher/applications/ApplicationsView.vue` |
| 报名数量与分布 | ✅ | 工作台 + 汇总页 |
| 制定面试安排、面试名单 | ✅ | `teacher/interviews/InterviewsView.vue` |
| 记录面试状态（缺勤/恢复） | ✅ | 同上 |
| 五维评分、文字评价、录取建议 | ✅ | `teacher/interviews/EvaluateView.vue` |
| 提交拟录取 / 递补名单 | ✅ | `teacher/admissions/AdmissionsView.vue` |
| 查看学生确认情况、剩余名额 | ✅ | `teacher/confirmations/ConfirmationsView.vue` |
| 查看本室最终名单 | ✅ | `teacher/final/FinalListView.vue` |
| 组长查看全室教师评价、汇总 | ✅ | `teacher/leader/LeaderInterviews.vue` |
| 组长协调拟录取名单 | ✅ | 与教师端共用名单页，数据范围为本室 |
| 内部调剂：空缺、候选、方案、确认、结果 | ✅ | `teacher/leader/AdjustmentsView.vue` |
| 提交学院审核、锁定、退回重提 | ✅ | `teacher/leader/SubmitReview.vue` |
| 操作留痕 | ✅（前端版） | `teacher/leader/OperationLogs.vue` |

> 超出大纲但已补：学生简历（教师评审需要）、阶段门禁开关、CSV 导出、移动端基础适配。

---

## 2. 教师 / 组长还能优化什么

### P0：影响后续联调，建议先做

| # | 问题 | 现状 | 建议 |
|---|---|---|---|
| 1 | **批次维度** | ✅ 已加 `stores/batch.js`、顶栏批次标签、`GET /meta/batches`；多批次切换待学院端数据 | 剩余：store 按 `batchId` 取数 |
| 2 | **多实训室** | ✅ 一人一室：25 个账号、按 `laboratoryId` 取数；不切室 | 剩余：`user_laboratories` 表接入真实授权 |
| 3 | **Q6/Q7/Q8 规则写死** | ✅ 已加 `stores/config.js` 与规则页；Q6 不再拉取跨室候选，Q7 控制是否需学生确认 | 剩余：接入后端下发值 |
| 4 | **同一学生多教师评价** | ✅ Mock 增加 20 条复评；组长汇总支持按学生聚合（平均分/建议分布/复评标记） | 剩余：真实多面试官排期与评价写入 |

### P1：体验与完整性

| # | 优化 | 价值 |
|---|---|---|
| 5 | 阶段倒计时 + 结束自动只读 | ✅ 已实现倒计时与严格时间门禁 |
| 6 | 面试安排日历视图、取消安排 | ✅ 取消批次已支持；日历视图仍缺 |
| 6.1 | 学院审核演示台 | ✅ `/demo/review` 读取多室提交快照，支持通过/退回（含跨室） |
| 7 | 名单搜索/导出 | ✅ 报名、拟录取、递补、日志已支持搜索/导出 |
| 8 | 简历附件真实预览 | 现在点“查看”只提示，等文件服务 |
| 9 | 通知中心 | ✅ 已按室/角色/用户过滤，含截止提醒 |
| 10 | 操作日志筛选/导出 | ✅ 已支持关键字、按室、导出 |

### P2：锦上添花

- 表格列宽/密度设置、打印样式；
- 移动端表单逐项验证（当前只做布局级）；
- 键盘操作与无障碍；
- 页面级 loading / error / 重试（接真实接口时必须有）。

---

## 3. 给其他端口预留什么

### 3.1 公共模块

| 能力 | 接口 | 数据表 | 前端预留 |
|---|---|---|---|
| 登录 / 当前用户 | `POST /auth/login`、`GET /auth/me`（已占位） | `users` | `api/auth.js` |
| 个人信息 / 改密码 | `GET/PUT /profile` | `users` | 顶栏“个人中心”（未做） |
| 消息通知 | `GET /notifications`、`POST /notifications/read` | `notifications`（预留） | 顶栏铃铛（未做） |
| 系统公告 | `GET /announcements` | `announcements`（预留） | 工作台公告位（未做） |
| 文件上传/下载 | `POST/GET /files`（已占位） | `files`（预留） | `api/file.js`、简历附件 |
| 操作记录 | 后端写 `operation_logs` | 已有 | `stores/logs.js` 可替换 |
| 帮助说明 | 静态页 | — | `/help`（未做） |

### 3.2 学生端（影响教师端的关键）

| 能力 | 接口 | 影响 |
|---|---|---|
| 志愿读写 | `GET/PUT /student/preferences` | 教师报名名单来源 |
| 确认录取 | `POST /student/admissions/:id/confirm` | 教师确认统计、空缺名额 |
| 超时/主动放弃 | `POST /student/admissions/:id/abandon` | **递补自动补位**必须由服务端做 |
| 个人结果 | `GET /student/result` | 最终名单一致性 |
| 简历/附件上传 | `POST /files` + 学生资料 | 教师端简历真实化 |
| 宣讲视频、全景 | `GET /labs/:id/media` | 教师/学院共同维护素材 |

### 3.3 学院端（影响组长端）

| 能力 | 接口 | 影响 |
|---|---|---|
| 审核通过/退回 | `POST /admin/submissions/:id/approve\|reject` | 组长提交后的唯一出口 |
| 名额调整 | `PUT /admin/labs/:id/quota` | 教师端剩余名额、调剂上限 |
| 批次与阶段 | `/admin/batches`、`/admin/stages` | 所有端的时间开关 |
| 发布公示 | `POST /admin/batches/:id/publish` | 最终名单冻结 |
| 跨室统筹调剂 | `/admin/adjustments` | 本室剩余名额的去向 |
| 统计与导出 | `/admin/stats`、`/admin/exports` | 汇报材料 |
| 异议处理 | `/admin/disputes` | 公示期流程 |

### 3.4 数据模型预留（`database/schema_reserved.sql`）

| 表 | 用途 | 为什么现在就要留 |
|---|---|---|
| `user_laboratories` | 教师/组长 ↔ 实训室多对多授权 | 没有它就无法做“多室切换”和严格越权 |
| `files` | 简历、成绩单、宣讲视频、全景资源 | 教师端附件、学生端上传、学院端素材共用 |
| `notifications` | 站内通知 | 学生确认、审核退回、调剂结果都要推送 |
| `announcements` | 学院公告/宣讲通知 | 学生端首页与教师端工作台都要展示 |

### 3.5 后端工具预留（建议由后端负责人补）

| 工具 | 用途 |
|---|---|
| `middleware/stage.js` | ✅ 已实现：按阶段拒绝写操作，返回 `4091 STAGE_CLOSED` |
| `middleware/scopeLab.js` | 已在 `auth.js` 提供，建议统一使用 |
| `utils/pagination.js` | 统一 `page/pageSize/total` |
| `utils/audit.js` | 统一写 `operation_logs` |
| `utils/idempotency.js` | 提交/确认/放弃防重复 |
| `services/storage.js` | 本地目录 / 对象存储适配 |
| `services/export.js` | Excel 导出任务（前端 CSV 仅过渡） |

---

## 4. 本次已经落地的预留

| 项 | 状态 |
|---|---|
| `GET /api/meta/enums` | ✅ 可用 |
| `GET /api/meta/stages` | ✅ 可用 |
| `GET /api/meta/config` | ✅ 可用（Q6/Q7/Q8 开关 + 功能开关） |
| 多实训室 | ✅ 一人一室：25 个账号、按 `laboratoryId` 取数，不切室 |
| 通知中心 | ✅ 铃铛 + 未读角标 + 抽屉（演示数据） |
| 批次展示 | ✅ 顶栏当前批次；切换待学院端 |
| 规则开关 | ✅ Q6 不拉取跨室候选、Q7 直接生效、配置持久化 |
| 多教师评价聚合 | ✅ 复评数据 + 按学生汇总视图 |
| `database/schema_reserved.sql` | ✅ 预留 4 张表 |
| `frontend/src/api/*` | ✅ 全部域的接口封装 |
| 501 占位路由 | ✅ auth / student / admin / files |

---

## 5. 建议的推进顺序

1. **批次 + 多室授权**（解锁所有端的“范围”概念）；
2. **文件服务 + 通知**（学生端、学院端都绕不开）；
3. **学院审核接口**（组长提交闭环的最后一环）；
4. **多教师评价聚合 + 阶段中间件**（正确性与防并发）；
5. **Excel 导出与统计**（答辩/汇报需要）。

## 6. 现在不建议做

- 真实对象存储、消息推送、跨室调剂算法：依赖外部决定，先留接口；
- 学院端/学生端页面：不属于你的分工，避免重复劳动；
- 过度 UI 打磨：契约未定前，改样式会反复返工。
