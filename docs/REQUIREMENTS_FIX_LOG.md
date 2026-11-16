# 问题修复记录

本文件记录本轮验收中发现的问题、修复方式、涉及文件与回归验证结果。修复原则：保留原技术栈（Vue3 + TypeScript + Element Plus / Node.js + Express），不删除已有功能，不使用 Mock 冒充真实业务。

## 一、审查前项目实际状态

| 项目 | 审查前状态 |
| --- | --- |
| 学生端 | 纯本地 Mock：`stores/student.ts` + `studentDemo.ts`，带“演示时钟/阶段切换”，数据保存 localStorage，不调用后端 |
| 教师端 | 路由指向 `views/FrameworkPage.vue` 占位页，菜单可点但无业务 |
| 组长端 | 同上，占位页 |
| 学院端 | 路由指向占位页；真实页面仅存在于 `origin/feature/college-admin` 分支，未合入 main |
| 后端 | Node Express 已有大部分接口，但角色可被 `X-Role` 头伪造；教师/组长可越权读取其他实训室；拟录取/调剂缺少名额与重复录取校验 |
| 数据层 | JSON 文件存储，无并发保护；MySQL DDL 未包含新增业务表 |

## 二、P0 修复（权限、数据正确性、核心规则）

### 1. 角色伪造与越权（`backend/middleware/auth.js`）

- 问题：`requireAuth` 直接信任客户端 `X-Role`，任意学生可携带 `X-Role: COLLEGE_ADMIN` 调用学院接口；`requireRole` 仅比较该伪造值。
- 修复：`requireAuth` 从数据层按 `uid` 加载账号，`activeRole` 只能取自账号实际角色（组长兼容教师权限）；账号停用直接 403；新增 `canAccessLab/guardLab` 统一实训室数据范围。
- 验证：冒烟测试“学生伪造 X-Role 访问用户管理被拒绝”“学生访问学院统计接口被拒绝”通过。

### 2. 志愿填报规则（`backend/routes/preferences.js`）

- 问题：不校验阶段状态与截止时间，截止后仍可修改；报名后不生成面试资格；教师可读取任意实训室报名名单。
- 修复：
  - 新增 `preferenceWindowError()`：阶段非 `IN_PROGRESS`、未开始或超过 `endTime` 均拒绝提交；
  - 保留最多 3 个、去重、实训室启停校验；
  - 提交时为每个志愿自动生成面试资格记录（不覆盖已有记录）；
  - `/lab/:labId` 增加 `guardLab`。
- 验证：“重复填报”“超过三个志愿”“截止后修改被拒绝”“教师跨室访问被拒绝”通过。

### 3. 面试评分（`backend/routes/interviews.js`）

- 问题：可为未报名学生安排面试；同一学生可重复创建面试记录；评分不校验实训室归属，也不要求五维齐全。
- 修复：排期前校验报名关系与实训室权限；重复排期改为更新；评分校验记录所属实训室；形成结论时必须五维齐全。
- 验证：“缺少考核维度的评分被拒绝”“五维评分提交成功”通过。

### 4. 拟录取、确认与递补（`backend/routes/admissions.js` 重写）

- 问题：拟录取可无限提交导致超额；学生可同时确认多个实训室；无自动确认、无超时释放、无递补提升；教师可操作其他实训室。
- 修复：
  - `occupiedCount()` 计算已确认拟录取 + 最终录取；
  - 拟录取前校验 `intended + confirmed < quota`，超额返回 400；
  - 只允许对本室已报名学生提交；
  - 单个待确认意向自动确认；已确认后再提交保持幂等；
  - 学生确认一个后，其余待确认意向自动 `REJECTED` 并触发递补；
  - `promoteAlternate()` 在放弃/超时/拒绝时提升最早递补；
  - `POST /expire` 批量处理超时并释放名额。
- 验证：“单个拟录取自动确认”“重复确认被拒绝”“拟录取超过名额被拒绝”通过。

### 5. 调剂规则（`backend/routes/adjustments.js` 重写）

- 问题：组长可对任意实训室提交内部调剂；无服从调剂意愿校验；无重复进池校验；已录取学生可再次调剂；名额计算可能重复计数。
- 修复：
  - 内部调剂强制来源=目标=组长本人实训室；
  - 新增 `validateAdjustment()`：已最终录取/已确认拟录取/已有确认调剂 → 拒绝；内部调剂需 `obeyInternalAdjustment`，跨室需 `obeyCollegeAdjustment`；目标名额按学生去重后校验；同一学生同一目标待确认记录去重；
  - 新增批量跨室调剂 `/cross-batch`、沟通安置 `/placement`、学院审核 `PUT /:id/status`；
  - 学生确认时二次校验名额与重复。
- 验证：“已确认录取学生进入调剂池被拒绝”“并发提交同一学生只成功一次”通过。

### 6. 最终名单、公示与入组（`backend/routes/final.js`）

- 问题：合并最终名单不校验超额；重复合并会丢失已入组状态；`/final/list` 任何登录用户可看全院名单；公示无需审核即可发布；正式入组可重复执行；学生无法提交异议。
- 修复：
  - 合并前按实训室统计并拒绝超额；
  - 保留已 `ENROLLED` 学生状态；
  - `/final/list` 限定学院/教师/组长，并只返回本人实训室；新增学生 `/final/my`；
  - 公示必须 `finalReview.status = APPROVED`，且起止时间合法；
  - 入组校验重复与角色范围；批量入组前重新校验超额/重复；
  - 新增学生异议提交/查询接口。
- 验证：“最终名单无超额录取/无重复录取”“公示发布成功”“学生提交异议成功”“批量入组成功”通过。

### 7. 并发写入（`backend/app.js`、`backend/data/seed.js`）

- 问题：JSON 存储“读取-修改-写回”在并发请求下会丢失更新。
- 修复：所有非 GET 请求进入串行队列；写文件改为临时文件 + 原子重命名；支持 `LAB_STORE_FILE` 指向测试副本。
- 验证：并发内部调剂测试仅一条成功。

## 三、P1 修复（主要业务功能补全）

| 模块 | 修复内容 | 涉及文件 |
| --- | --- | --- |
| 学院端 | 从 `origin/feature/college-admin` 引入 21 个真实业务页面（批次、阶段、学生、实训室、宣讲、开放日、志愿、面试、拟录取、确认、空缺、候选、内部/跨室调剂、安置、最终名单、公示、统计、日志），并接入路由 | `frontend/src/views/college/*`、`frontend/src/api/college.ts`、`frontend/src/router/index.ts` |
| 学院端后端 | 引入用户管理、学院统计、开放日路由与操作日志工具 | `backend/routes/users.js`、`statistics.js`、`openDays.js`、`backend/utils/audit.js`、`app.js` |
| 教师端 | 新增 8 个真实页面：工作台、本室信息、报名学生、面试管理（排期/五维评分）、初选建议、确认进度、补录、成员 | `frontend/src/views/teacher/*`、`frontend/src/api/lab.ts` |
| 组长端 | 新增 6 个真实页面：工作台、选拔汇总、确认进度、内部调剂、补录统筹、名额统计/上报 | `frontend/src/views/leader/*` |
| 教师/组长统计 | 新增 `/api/statistics/lab/:labId` 与 `/candidates` | `backend/routes/statistics.js` |
| 组长名额上报 | 新增 `/api/laboratories/:id/vacancy-report`；组长不可修改招生名额与负责人 | `backend/routes/laboratories.js` |
| 学生端 | 全面改为后端数据：工作台、志愿填报、面试、拟录取确认、调剂、补录、公示与异议、消息、实训室资料、宣讲、开放日、个人中心；移除演示时钟与 localStorage 演示数据 | `frontend/src/api/student.ts`、`frontend/src/views/student/*`、`StudentLayout.vue` |
| 消息通知 | 限制只有学院/教师/组长可发消息，且只有学院可全院群发；学生只接收本人或本角色通知 | `backend/routes/notifications.js` |
| 数据迁移 | 新增 `database/migration_v2.sql`：用户-实训室绑定、面试/拟录取唯一索引、最终审核表、异议表、开放日表、宣讲字段 | `database/migration_v2.sql` |

## 四、P2/P3 修复与优化

| 项 | 内容 |
| --- | --- |
| 真实 Excel 导出 | 前端引入 `xlsx` 依赖，学院/教师/组长页面导出真实 `.xlsx` 文件 |
| 路由重构 | `router/index.ts` 中教师/组长/学院由占位页切换为真实组件；移除无用 `PageDefinition` |
| 登录返回字段 | `/auth/login`、`/auth/me`、`/auth/switch-role` 返回 `laboratoryId`，前端类型同步 |
| 错误与空态 | 新增页面统一 loading、空数据、接口错误提示 |
| 代码质量 | 删除占位接口常量与未使用类型；后端路由统一 `ok()`/错误码返回 |

## 五、未修复/保留事项

| 事项 | 原因 | 建议 |
| --- | --- | --- |
| MySQL 未实际接入 | 现有运行环境无 MySQL，直接切换会破坏可运行性 | 生产部署时执行 `schema.sql` + `migration_v2.sql`，将数据层替换为 MySQL 事务实现 |
| 媒体二进制上传 | 现有资源以 URL 维护，需求未明确存储方式 | 如学院要求站内上传，增加对象存储或 multer 上传 |
| 服务端分页 | 当前数据量小，使用前端分页 | 数据规模增大后补充分页参数 |
| 移动端适配 | 以桌面端为主 | 按学院实际终端补充断点与专项测试 |
| 自动调剂匹配算法 | 需求未给出权重 | 保留人工方案，记录为待确认 |
| 面试地点/形式字段 | 需求描述但未给字段口径 | 待学院确认后扩展数据模型 |

## 六、修改文件清单

- 后端：`app.js`、`middleware/auth.js`、`data/seed.js`、`routes/{auth,preferences,interviews,admissions,adjustments,final,laboratories,statistics,notifications,users,openDays,announcements,batches,logs}.js`、`utils/audit.js`、`tests/api.smoke.js`、`package.json`
- 前端：`router/index.ts`、`router/menus.ts`、`layouts/AppLayout.vue`、`layouts/StudentLayout.vue`、`types/index.ts`、`api/{college,lab,student}.ts`、`views/college/*`、`views/teacher/*`、`views/leader/*`、`views/student/*`、`package.json`、`package-lock.json`
- 数据库：`database/migration_v2.sql`
- 文档：`docs/REQUIREMENTS_AUDIT.md`、`docs/REQUIREMENTS_FIX_LOG.md`、`docs/TEST_REPORT.md`、`docs/API.md`、`docs/DATABASE.md`、`README.md`

## 七、第二轮补全（2026-11-12）

本轮针对审查报告中“未完成 / 部分完成但无需额外素材信息”的事项逐项补齐。

| 事项 | 处理结果 | 涉及文件 |
| --- | --- | --- |
| 帮助与说明 | 新增帮助中心，按角色展示八阶段说明、操作指引、FAQ，并高亮当前阶段；学生、教师、组长、学院菜单与用户下拉均可进入 | `frontend/src/views/common/HelpCenter.vue`、`router/index.ts`、`router/menus.ts`、`layouts/AppLayout.vue`、`StudentLayout.vue` |
| 个人信息管理 | 新增 `PUT /api/auth/profile`（手机号/邮箱）与 `PUT /api/auth/password`；学生端与后台个人中心均可编辑并保存 | `backend/routes/auth.js`、`views/common/ProfilePage.vue`、`views/student/StudentProfile.vue`、`router/index.ts` |
| 系统公告入口 | 非学生角色新增 `/announcements` 公共公告页，替换原占位页；用户下拉可直接进入 | `views/common/AnnouncementsPage.vue`、`router/index.ts`、`AppLayout.vue` |
| 站内文件上传 | 新增 `POST /api/media/upload`（multer，图片/视频/PDF ≤100MB），`/uploads` 静态访问；宣讲管理上传后自动回填视频地址；前端 dev server 增加 `/uploads` 代理 | `backend/routes/media.js`、`views/college/CollegeBriefing.vue`、`vite.config.ts` |
| 实训室导师团队 | 新增 `labTeachers` 集合与 `lab_teachers` 表；实训室详情返回导师团队；学生端详情展示，学院端可增删改，组长可维护本室导师（越权返回 403） | `backend/data/seed.js`、`routes/laboratories.js`、`views/college/CollegeLabDetail.vue`、`views/student/StudentCatalog.vue`、`api/student.ts` |
| 服务端分页 | 新增 `utils/pagination.js`；`GET /users`、`GET /logs` 支持 `page/pageSize`，未传分页参数时保持原数组返回；学院端学生列表与操作日志接入分页并支持全量导出 | `backend/utils/pagination.js`、`routes/users.js`、`routes/logs.js`、`api/college.ts`、`types/index.ts`、`views/college/CollegeStudents.vue`、`CollegeLogs.vue` |
| 移动端适配 | `AppLayout` 增加 992px/768px 断点（品牌文字收起、导航横向滚动、主区收窄、弹窗自适应），帮助页与个人中心同步适配 | `layouts/AppLayout.vue`、`views/common/*` |
| MySQL 数据源 | 新增数据源适配层与运维脚本：`DB_DRIVER=mysql` 时启动全量加载、写入事务同步、snake/camel 自动映射、未知字段写入 `extra_json`；支持 `npm run db:init` / `db:check`；连接失败启动即失败并给出操作提示 | `backend/data/mysql.js`、`backend/data/seed.js`、`backend/scripts/db.js`、`backend/app.js`、`backend/package.json`、`database/migration_v3.sql` |
| 数据库迁移 | 新增 `migration_v3.sql`：用户邮箱、导师团队表、宣讲视频类型、剩余名额上报字段、开放日兼容字段、异议状态补充、全部业务表 `extra_json` 兜底列 | `database/migration_v3.sql` |
| 测试扩展 | 接口冒烟测试由 30 项扩展到 41 项，新增个人信息、分页、导师团队 CRUD/越权、真实文件上传/越权用例 | `backend/tests/api.smoke.js` |

### 本轮仍未完成 / 需外部条件

| 事项 | 原因 |
| --- | --- |
| MySQL 实机端到端验证 | 当前环境无 MySQL 服务，已完成代码与迁移脚本，需在部署环境执行验证 |
| 真实宣讲视频、全景图、实训室照片 | 需学院提供素材，接口与上传能力已就绪 |
| 移动端真机走查 | 已补响应式断点，需在目标机型逐页验证 |
| 自动调剂匹配算法等 5 项业务口径 | 需求未给出规则，保留人工操作与配置能力，见审查报告 Q-01 ~ Q-05 |
