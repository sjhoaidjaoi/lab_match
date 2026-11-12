# 交接说明（HANDOFF）

> 给接手本项目的下一个 AI / 开发者。读完这一页，再去读 `docs/` 里的三份文档，就能直接继续。
> 最后更新：2026-11-10

---

## 0. 一句话现状

第一阶段**系统骨架已完成**：6 间实训室 / 25 位教师 / 400 名学生；教师端 8 页 + 组长端 11 个增量页；一人一室，登录哪个账号就只管哪一间。数据基于 Mock，`npm run build` 与 `npm run smoke` 均通过。
学生端、学院端仍是占位页；后端只有接口骨架（返回空 Mock）；数据库只有 SQL，未落地。

---

## 1. 交接入口（按顺序读）

| 顺序 | 文件 | 作用 |
|---|---|---|
| 1 | `docs/HANDOFF.md` | 本文件，现状与坑 |
| 2 | `docs/REQUIREMENTS.md` | 原始需求（八阶段、四角色、10 张表） |
| 3 | `docs/DEVELOPMENT.md` | 启动方式、目录、分工边界 |
| 4 | `docs/API.md` | 教师/组长端接口契约 + 提交审核状态机 |
| 5 | `docs/DATABASE.md` | 数据模型与两处建模调整 |
| 6 | `docs/INTEGRATION.md` | **整体接口预留、依赖矩阵与 Mock 替换点** |
| 7 | `docs/ROADMAP.md` | **大纲对照、可优化项、给其他端的预留清单** |
| 8 | `docs/MERGE_CHECKLIST.md` | **合并前检查、范围声明、回滚方式** |
| 9 | `docs/SECURITY.md` | **安全契约：权限、导出、日志、文件** |
| 6 | `README.md` | 完成度清单 |

---

## 2. 项目位置与环境

```text
项目根目录：~/桌面/aaa/training-room-selection
分支：main
远程仓库：无（用户明确要求暂不接云仓库，不要执行 git remote / push）
工作区：干净，3 次提交
```

| 项 | 状态 |
|---|---|
| Node.js | 系统未安装；免安装版在 `~/.local/node`，用前 `export PATH="$HOME/.local/node/bin:$PATH"` |
| npm 源 | 已设 `registry.npmmirror.com` |
| MySQL | **未安装**；sudo 需要密码，无法直接 apt |
| node_modules | 已装（129M，git 忽略） |
| 磁盘 | 剩余约 9.6G |

提交历史：

```text
0ad0c1f refactor: 收敛本室业务数据到 room store
b80c4c0 feat(leader): 组内提交审核状态机与名单锁定
2448d0e chore: 初始化实训室选拔平台骨架
```

---

## 3. 目录与职责

```text
training-room-selection/
├── frontend/                       Vue3 + Vite + Element Plus
│   ├── scripts/smoke.mjs           业务数据/状态机冒烟测试（npm run smoke）
│   └── src/
│       ├── api/                    按域封装：auth / meta / teacher / student / admin / file
│       ├── constants/enums.js      状态标签单一来源（与后端 constants 对齐）
│       ├── components/             StatCard / QuotaBar / StatusTag / StageBanner / PageHeader / AuditTimeline
│       ├── config/menus.js         菜单：leaderOnly 控制组长增量分组
│       ├── layouts/RoleLayout.vue  唯一工作台布局
│       ├── mock/                   10 个 Mock 文件（含 schedule；400 学生 / 6 间实训室）
│       ├── utils/                  exportCsv / exportScope / time
│       ├── router/index.js         四端路由 + 角色守卫
│       ├── stores/                 auth / stage / room / submission / interviews / logs /
│       │                            config / batch / notifications / reviewQueue / clock / timeRequests
│       └── views/
│           ├── teacher/            教师端 8 页（已实现）
│           │   └── leader/         组长增量 11 页（已实现，含时间申请/日志）
│           ├── student/            —（占位，走 PlaceholderView）
│           ├── admin/              —（占位）
│           ├── common/             403、占位页
│           └── login/              演示角色选择
├── backend/                        Express + JWT/RBAC 骨架（不接数据库可启动）
│   └── src/
│       ├── constants/enums.js      全系统枚举与错误码
│       ├── routes/meta.routes.js   枚举、阶段模板（已可用）
│       ├── routes/auth|student|admin|file|notification.routes.js  契约占位，返回 501
│       ├── routes/teacher.routes.js  已按 API.md 挂满路由
│       ├── controllers/              统一包 ok()
│       └── services/                 返回空/统计 Mock，待换 SQL
├── database/                       schema.sql（10 表）+ schema_reserved.sql（4 张预留表）+ seed.sql
└── docs/                           本文件 + REQUIREMENTS + API + DATABASE + DEVELOPMENT +
                                    DECISIONS + SECURITY + ROADMAP + MERGE_CHECKLIST + ISSUE_LEDGER
```

---

## 4. 已跑通的流程

**登录**：`/login` 点“实训室教师”后，从 25 个教师账号中选一个；每个账号只属于一间实训室，组长额外拥有本室统筹功能。无密码，账号信息写入 `localStorage`。

**教师端 `/teacher`**（LAB_TEACHER 与 LAB_LEADER 都可见）

1. 工作台：9 个指标卡 + 名额进度 + 待办
2. 本室信息：只读；组长才显示“编辑”（占位）
3. 报名管理：搜索、调剂意愿筛选、学生详情抽屉（含简历：专业/GPA/技能/项目/附件）
4. 面试管理：**6 室时间梯度 + 教师专属时段**、按区间判冲突、时长、改期/取消、添加复评（每生最多 2 位）
5. 面试评价：五维滑块 + 文字评价 + 建议
6. 拟录取管理：拟录取 / 递补两个 Tab，可从面试结果加入、顺位上下移、超名额禁止提交
7. 录取确认：统计 + 明细；联调面板可模拟学生确认 / 超时放弃，放弃后按递补顺位自动补位
8. 最终名单：只读 + CSV 导出

**组长增量 `/teacher/room`**（仅 LAB_LEADER）

1. 本室综合：全室统计 + 教师进度
2. 教师与面试情况
3. 面试汇总：**按学生聚合多位面试官**（平均分、建议分布、复评标记）或按记录查看五维评分，可筛选与导出
4. 报名及录取汇总（含调剂意愿分布）
5. 确认汇总
6. **内部调剂**：空缺 → 候选池 → 方案 → 学生确认 → 结果（5 步）
7. 提交学院审核：状态机 + 操作时间线 + 提交 JSON 快照 + 联调面板
8. 规则开关：Q6/Q7/Q8 与功能开关演示，联动候选池与调剂确认
9. 本室最终名单
10. 时间变更申请（提交学院端）
11. 操作日志：名单增补/移出、确认、放弃、调剂、提交、审核留痕

**权限**：普通教师访问 `/teacher/room/**` → 路由守卫跳 `/403`；后端 `requireRole('LAB_LEADER')` 二次拦截。
**导出**：组长可导出本室全部；普通教师只能导出本人面试过的学生，CSV 带水印、手机号脱敏。

**学院审核演示**：`/demo/review`（需学院负责人或组长登录）读取各实训室提交快照，
可查看 JSON、通过、退回（退回原因计入时间线与操作日志）。真实环境由学院端实现同一契约。

**顶栏**：显示当前批次和本室名称；**不提供切室**（一人一室）；通知按钮带未读角标。

**时间与截止**：系统时间固定为 2026-11-04 13:00（第 6 阶段），页面只显示、不提供修改入口；
确认截止 11/4 12:00、内部调剂/提交截止 11/5 17:00、评价截止 11/3 17:00。
过期后写操作禁用；确认页“按规则结算”单意向自动确认、多意向按志愿顺序自动选，保留快照且幂等。
需要改时间只能走「本室统筹 → 时间变更申请」，由学院端审批。
阶段/批次默认使用演示值；设置 `VITE_STAGE_SYNC=true` / `VITE_BATCH_SYNC=true` 后从 `/api/meta/*` 拉取（失败静默回退）。

**阶段门禁**：阶段状态由时间计算；严格模式下还要求上一阶段完成（评价/确认/调剂）。
- 关闭（默认）：八阶段页面都可操作，便于演示；
- 打开：写操作只在当前阶段开放，报名/面试/拟录取/确认/调剂/提交会各自禁用并提示。

**名单操作**：拟录取页可从面试结果勾选加入，加入后为「待学生确认」；确认页可模拟确认或超时放弃，放弃者移入留档列表，并按递补顺位自动补 1 人（补位学生仍待确认）。

---

## 5. 关键架构决策（改动前先理解）

1. **只有一个教师工作台，组长是“教师 + 增量”**，不是第二个登录入口。
   实现：`LAB_LEADER` 与 `LAB_TEACHER` 共用 `/teacher` 父路由；组长页面 `meta.roles = ['LAB_LEADER']`；菜单 `leaderOnly`。

2. **数据收敛到 `stores/room.js`**。
   拟录取、递补、调剂候选/理由、名额、空缺、最终名单都从这一个 store 派生。
   页面不再各自持有副本；写操作后 `persist()` 到 `localStorage`。

3. **两处数据库建模偏离原需求**（原因见 `docs/DATABASE.md`）：
   - `student_preferences` / `interviews` 增加 `round_no`：流程图第 6 步是“重新填报 + 再面试”，文档是“内部调剂不面试”，加轮次才能两种都兼容；
   - 调剂意愿拆出 `student_batch_wishes`：意愿是“学生 × 批次”属性，挂在每条志愿上会不一致。

---

## 6. 状态与数据字典

### Pinia stores

| store | 职责 | 持久化 key |
|---|---|---|
| `auth` | 角色、真实姓名、laboratoryId/Name | `trs_role` / `trs_name` / `trs_lab` / `trs_lab_name` |
| `stage` | 八阶段、演示阶段切换、严格门禁开关 | 无（内存态） |
| `room` | 本室全部业务数据与名额计算（按实训室隔离） | `trs_room_state_v3:<labId>` |
| `interviews` | 面试记录、评价、缺勤、面试安排、按教师汇总（按实训室隔离） | `trs_interviews_v2:<labId>` |
| `logs` | 关键操作留痕（前端版，最多 200 条，跨室共享） | `trs_operation_logs_v1` |
| `notifications` | 站内通知（演示数据，可标记已读） | `trs_notifications_v1` |
| `batch` | 当前批次展示（切换待学院端多批次数据） | 无 |
| `config` | Q6/Q7/Q8 规则、功能开关、五维权重（演示可改） | `trs_config_v1` |
| `clock` | 固定系统时间（默认 2026-11-04 13:00，持久化，不提供改时入口） | `trs_demo_now_v1` |
| `timeRequests` | 时间变更申请（提交学院端） | `trs_time_requests_v1` |
| `logs` | 哈希链完整性可校验（前端） | `trs_operation_logs_v1` |
| `reviewQueue` | 学院审核演示队列（扫描各室 REVIEWING 快照） | 无 |
| `submission` | 提交审核状态机与时间线（按实训室隔离） | `trs_submission_state_v2:<labId>` |

**清空演示数据**：浏览器控制台执行
```js
localStorage.removeItem('trs_room_state_v3:1')
localStorage.removeItem('trs_room_state_v3:2')
localStorage.removeItem('trs_interviews_v2:1')
localStorage.removeItem('trs_interviews_v2:2')
localStorage.removeItem('trs_submission_state_v2:1')
localStorage.removeItem('trs_submission_state_v2:2')
localStorage.removeItem('trs_operation_logs_v1')
localStorage.removeItem('trs_notifications_v1')
localStorage.removeItem('trs_submission_state')
location.reload()
```
或点「提交学院审核」页的“重置为草稿”（只重置 submission），当前实现里该按钮同时调用 `room.resetAll()`。

### 枚举（前后端必须一致）

| 枚举 | 取值 |
|---|---|
| role | STUDENT / LAB_TEACHER / LAB_LEADER / COLLEGE_ADMIN |
| admission status | PENDING / CONFIRMED / ABANDONED / RELEASED |
| admission type | INTENDED / ALTERNATE |
| recommendation | ADMIT / ALTERNATE / REJECT |
| adjustment type | INTERNAL / CROSS_LAB / MANUAL_PLACEMENT |
| submission status | DRAFT / REVIEWING / APPROVED / REJECTED |

### Mock 数据口径（改数据必跑 smoke）

学生 400 人、实训室 6 间（每室教师 4~5 人，每人名额 16）。
演示室（lab 1）：报名 **199**、已评价学生 **145**、待评价学生 **54**、面试记录 **219**（含 20 条复评）、名额 **64**、拟录取 **64**、已确认 **56**、空缺 **8**、递补 **12**、调剂候选 **24**。

---

## 7. 已知缺口（按建议优先级）

| 优先级 | 缺口 | 位置 / 说明 |
|---|---|---|
| P0 | 后端全是空 Mock | `backend/src/services/teacher.service.js` 返回 `list: []`，需换 SQL 或内存实现 |
| P1 | 真实登录缺失 | 目前点卡片即登录；`backend/middleware/auth.js` 已写好 JWT/RBAC，但没有登录接口与密码校验 |
| P1 | 学院端 / 学生端占位 | `views/admin`、`views/student` 未实现；审核闭环目前是 `/demo/review` 演示台，需换真实 `/api/admin/submissions` |
| P1 | 学生确认/放弃 | 页面已明确标注“本地模拟”，待学生端接口 |
| P1 | 提交审核的联调面板是演示 | `SubmitReview.vue` 里“模拟通过/退回”必须由学院端真实接口替换 |
| P2 | 全景、视频、上传 | 占位组件 |
| P2 | CSV 导出仅前端 | `utils/exportCsv.js` 已可用，但未走后端审计 |
| P2 | MySQL 未落地 | `database/schema.sql` 可直接执行；无 MySQL 环境 |
| P2 | 阶段为演示可切换 | 横幅可手动切换并开启“按阶段锁定”，真实实现应由后端按时间返回 |
| P2 | 移动端为基础上适配 | 侧边栏改抽屉、统计卡两列、表格横向滚动；复杂表单仍需人工验证 |
| P2 | 阶段时间按后端计算 | 后端已实现；前端固定时间、不提供改时入口，改时走「时间变更申请」 |
| P2 | 批次切换 | 目前只展示当前批次，多批次切换需学院端提供数据 |
| — | 面试时段 | 已改为 `[time, time+durationMin)` 区间重叠判断，首尾相接不算冲突 |
| — | 多实训室 | 每个教师/组长账号固定一间；页面按当前实训室取数，不再切换 |
| P2 | 操作日志仅前端 | 已记录关键动作，但未写数据库、无防篡改；日志未按实训室隔离 |
| P2 | 通知为演示数据 | 未接入后端推送，学生确认/放弃不会自动生成 |

---

## 8. 易踩的坑

1. **不要给项目加远程仓库**：用户明确说云仓库不成熟，保持本地提交。
2. **Node 不在 PATH**：每条新终端都要 `export PATH="$HOME/.local/node/bin:$PATH"`，否则 `npm` 报 `/usr/bin/env: node`。
3. **`npm run smoke` 的断言绑定 Mock 数字**：改 `mock/**` 后如果候选数/名额变了，要同步改 `frontend/scripts/smoke.mjs`。
4. **Mock 之间是链式依赖**：`applications` ← `students`，`interviews` / `admissions` / `adjustments` ← `applications`。动 `students.js` 会影响候选池人数。
5. **阶段/时钟是固定演示值**：阶段由固定时间推导，严格模式；真实实现由后端下发，前端只展示。
6. **写操作是三层**：阶段/截止 → 提交锁定 → 函数/store 守卫。新增写操作三层都要加，后端接上后还必须加服务端校验。
7. **名额/空缺一律从 store 派生**：不要在新页面再 `filter` 一遍，否则数字会和侧边栏对不上。
8. **名单与候选池互斥**：加入拟录取/递补时会自动移出候选池；新增写操作时记得同步，否则同一学生可能被重复安置。
9. **Pinia 里不要给 state 同名字段再定义 getter**（如 `rules`），会读到 undefined；需要派生值请换个名字。
10. **操作日志是前端留痕**：`stores/logs.js` 有哈希链但可清空，不能当作审计依据。

---

## 9. 验收方式

```bash
export PATH="$HOME/.local/node/bin:$PATH"
cd ~/桌面/aaa/training-room-selection/frontend

npm run build     # 编译必须通过
npm run smoke     # 234 项断言必须全 PASS

# 后端契约自检
cd ../backend && npm run dev
curl http://localhost:3000/api/meta/enums
npm run dev       # http://localhost:5173
```

手工回归路径（5 分钟）：

1. `/login` → 实训室组长
2. 「拟录取管理」移出一人 → 回「本室综合」看数字变化
3. 「内部调剂」勾 3 人 → 应被拦截并回滚到 2 人
4. 填理由 → 下一步 → 模拟学生确认 → 结果页显示剩余名额
5. 「提交学院审核」勾四项 → 提交 → 回拟录取页，按钮全灰
6. 回提交页 → 模拟退回并填原因 → 拟录取页恢复可编辑 → 时间线出现退回记录

---

## 10. 待学院确认的业务问题

原需求第十一节共 12 条。代码里已做“可配置/待确认”标注，重点三条：

- **Q6** 内部调剂候选是否只来自本室报名学生 → 当前实现：是（`mock/adjustments.js`）
- **Q7** 内部调剂是否必须学生再次确认 → 当前实现：是（调剂第 4 步，`PENDING` 中间态）
- **Q8** 跨室调剂是否允许进入未填报的实训室 → 未实现，属学院端

---

## 11. 给下一个 AI 的启动提示词（可直接复制）

```text
项目在 ~/桌面/aaa/training-room-selection，是一个 Vue3 + Vite + Element Plus 的
“实训室双向选拔平台”骨架，当前只实现教师端和组长端，数据全部来自 Mock。

请先依次阅读：
1. docs/HANDOFF.md（交接说明与已知坑）
2. docs/REQUIREMENTS.md（八阶段、四角色、10 张表）
3. docs/API.md（接口契约与提交审核状态机）
4. docs/DATABASE.md、docs/DEVELOPMENT.md

约束：
- 这是本地 git 仓库，没有远程，不要 git remote / push。
- Node 需先 export PATH="$HOME/.local/node/bin:$PATH"；机器没有 MySQL。
- 组长不是独立入口，是教师权限 + /teacher/room/** 增量页面。
- 业务数据以 stores/room.js 为准，不要在各页面另建副本。
- 任何写操作要同时做：按钮禁用 + 函数守卫（后端接上后还要服务端校验）。
- 改完必须跑 npm run build 和 npm run smoke。

当前最该做的下一步：把后端 services 从空 Mock 换成真实实现（或先接 SQLite），
并补登录接口，让前端的 store 能逐步替换成 API 调用。
```
