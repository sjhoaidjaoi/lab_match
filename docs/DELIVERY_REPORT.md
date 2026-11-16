# 交付报告：学院端实训室资料统一管理、权限重构及账号初始化

- 分支：`feature/workspaces-and-college-pages`
- 提交：`56b4759 feat(lab): 学院统一维护实训室资料 + 组长端权限重构 + 七个账号初始化`
- 说明：该提交同时夹带了上一轮已完成但未提交的「在线面试录制 / 回放」相关改动（`backend/routes/interviewVideo.js`、`backend/services/interviewRecording.js`、`frontend/src/views/common/InterviewMeeting.vue` 等），与本需求无耦合，不影响本次功能。

---

## 1. 功能总结

### 1.1 学院端新增一级菜单「实训室资料管理」

**总览页** `/college/lab-materials`

- 顶部四项统计：实训室总数、教师总人数、本学年招生总名额、已分配教师招生名额（均由后端聚合，前端不写死）。
- 卡片展示：编号徽标、名称（缺失时显示「编号 实训室」，不编造）、所属学院、位置、研究方向、教师人数、招生总名额、资料完善程度（进度条）。
- 支持按编号/名称/学院/位置/研究方向关键字搜索，支持排序（编号、教师数、名额、完善度），支持「仅看资料未完善」筛选。
- 「查看详情」「编辑资料」两个入口；另有「全院宣传资料」抽屉，汇总六个实训室的全部附件。
- 支持新建实训室（仅编号必填，其余留空）。

**详情页** `/college/lab-materials/:id`，四个 Tab：

| Tab | 内容 |
| --- | --- |
| 基础资料 | 14 个字段的完整表单，保存/取消/校验/dirty 态提示 |
| 教师管理 | 表格 + 姓名搜索 + 身份筛选 + 抽屉式新增/编辑 + 设为组长 + 移除关联 |
| 招生名额 | 实训室级四项统计 + 总名额设置 + 教师级名额分配表（实时合计校验） |
| 宣传资料 | 上传（进度条）/预览/下载/删除 |

### 1.2 基础资料

- 支持字段：实训室编号（唯一）、名称、所属学院、位置、简介、详细介绍、主要研究方向、主要项目方向、实训室特色、主要研究成果、设备及资源、联系方式、其他备注。
- 编号重复返回 `409`；仅学院负责人可改（组长读旧接口也被白名单拦回 `403`）。
- 所有字段允许留空，不强制填写，不自动填充任何编造内容。
- 已有关联业务数据的实训室不做物理删除（本次未提供物理删除入口，仅存档/停用能力保留在底层）。
- 保存后 `/api/laboratories` 同步返回新字段，学生端目录页、组长端、教师端立即读到最新值。

### 1.3 教师信息管理

- 字段：姓名、教师编号、性别（可选）、职称、学历/学位、所属实训室、身份（组长/普通教师）、研究方向、负责项目、个人简介、邮箱、办公地点、照片、其他备注。
- 教师信息集中存储于 `labTeachers`，学院端与组长端读同一份数据，无第二套副本。
- **教师与登录账号分开建模**：`labTeachers.userId` 可为空，新增教师不会自动生成账号；如需绑定，由学院在下拉中选择既有账号。
- 移除关联一律软删除（`status='INACTIVE'` + `deletedAt`），接口返回 `retainedHistory: true`，报名/面试/录取历史不丢。
- 教师账号绑定信息（`accountName` / `userId` / 账号状态）仅学院与本室成员可见，其他角色读到 `null`。

### 1.4 招生名额管理

- 学年口径 `YYYY-YYYY`，按学年独立存储于 `labYearlyPlans` / `teacherYearlyQuotas`，**跨学年不覆盖**，支持切换学年查看历史。
- 实训室级：学年、总名额、已分配、未分配、已录取、剩余可录取。
- 教师级：姓名、所属室、当前学年名额、已录取、剩余可录取。
- 校验规则：非负整数；教师合计 `≤` 总名额（`409`）；总名额不得低于已分配（`409`）；已录取数硬约束，改名额不会破坏已有录取记录。
- 名额不作为教师基础资料的固定字段，只按学年挂账。

### 1.5 宣传资料管理

- 支持 ppt/pptx/pdf/doc/docx/mp4/webm/mov/png/jpg/jpeg/webp/gif，单文件上限 200MB。
- 展示文件名、类型、所属室、上传者、时间、大小，支持预览（图片/视频/PDF）、下载、删除（带确认）。
- 学院可管全部实训室；组长只能操作本室文件，且本室由后端从 token 解析，不读请求参数，无法通过改 `labId` 越权。
- 落盘文件与数据库记录一一对应；磁盘文件名用 UUID，中文原文件名存库并在下载时还原（修正了 multer `latin1` 乱码问题）。

### 1.6 组长端权限重构

**已收回（只读可见，写入返回 403 `ROLE_FORBIDDEN`）**：实训室名称、编号、位置、基础介绍、教师名单、教师资料、教师身份、教师所属室、招生总名额、教师招生名额、学年计划。

**保留**：本室宣传资料上传/删除；原有的报名审核、面试安排、线上会议、面试记录、筛选、内部调剂等全部业务权限。

**实现方式**：`backend/routes/laboratories.js` 增加 `LEADER_MEDIA_FIELDS` 白名单（仅 `briefingVideoUrl` / `briefingVideoType` / `tourVideoUrl` / `tourVideoType` / `introductionVideo` / `panoramicResource`），组长提交任何白名单外字段直接拒绝；`labProfiles.js` 独立以 `isCollege` / `isOwnLabLeader` 判定。两层叠加，绕旧接口也无法越权。

### 1.7 账号初始化

七个账号已建立，密码 bcrypt 哈希（cost 10），明文不入库，前端无硬编码：

| 账号 | 角色 | 绑定实训室 | 首登强制改密 |
| --- | --- | --- | --- |
| `rjxyrjxy` | 学院负责人 | — | 是 |
| `rjxy@202` | 组长 | 202 | 是 |
| `rjxy@204` | 组长 | 204 | 是 |
| `rjxy@402` | 组长 | 402 | 是 |
| `rjxy@404` | 组长 | 404 | 是 |
| `rjxy@406` | 组长 | 406 | 是 |
| `rjxy@505` | 组长 | 505 | 是 |

初始密码常量定义在 `backend/utils/accountCredentials.js` 的 `INITIAL_PASSWORD`，脚本 `require` 引入，不手写字面量。

### 1.8 全平台数据统一

学院端是唯一权威入口。学院修改后：

- `/api/lab-profiles/*`（学院端、组长端）立即读到新值；
- `/api/laboratories` 列表/详情同步补齐 `displayName` / `labCode` / `college` / `location` / `researchDirection` / `detail` / `features` / `achievements` / `equipment` / `contact` / `remark` / `academicYear`，学生端目录页与教师端读同一份；
- `recruitmentQuota` 统一改由 `totalQuotaOf(store, lab, currentYear)` 计算，跨学年不混用。

---

## 2. 新增 / 修改文件清单

### 后端新增（7）

| 文件 | 作用 |
| --- | --- |
| `backend/utils/labProfile.js` | 学年口径、名额计算、完善度、显示名、字段归一化的公共层 |
| `backend/routes/labProfiles.js` | 18 个接口，学院端唯一权威出口 |
| `backend/scripts/init-college-data.js` | 幂等初始化：六实训室 + 七账号 |
| `backend/scripts/inspect-accounts.js` | 只读账号影响范围报告（`npm run accounts:report`） |
| `backend/tests/lab-profile.js` | 50 项验收用例 |
| `database/migration_v10.sql` | 非破坏性 DDL |
| `frontend/src/api/labProfiles.ts` / `frontend/src/components/lab/LabPromotionFiles.vue` | 见前端 |

### 后端修改（7）

`backend/app.js`（挂载路由）、`backend/data/seed.js`（三张新集合 + 迁移默认值）、`backend/data/mysql.js`（表注册 + migration 前置）、`backend/routes/laboratories.js`（权限反转 + 字段补齐）、`backend/tests/api.smoke.js`（权限预期对齐）、`backend/package.json`（三个 script）、`backend/.env.example`（占位环境变量）。

### 前端新增（4）

| 文件 | 作用 |
| --- | --- |
| `frontend/src/api/labProfiles.ts` | 类型定义 + 全部接口 + blob 下载/预览 |
| `frontend/src/components/lab/LabPromotionFiles.vue` | 可复用宣传资料列表（上传/预览/下载/删除） |
| `frontend/src/views/college/CollegeLabMaterials.vue` | 总览页 |
| `frontend/src/views/college/CollegeLabMaterialDetail.vue` | 详情页四 Tab |

### 前端修改（6）

`frontend/src/router/index.ts`（两条路由）、`frontend/src/router/menus.ts`（菜单项）、`frontend/src/types/index.ts`（`LabView` 补 12 字段）、`frontend/src/views/leader/LeaderLabInfo.vue`（整体重写为只读）、`frontend/src/views/leader/LeaderLabContent.vue`（宣讲介绍只读）、`frontend/src/views/student/StudentCatalog.vue`（展示学院维护字段）。

### 文档

`docs/DELIVERY_REPORT.md`（本文件）、`docs/DATABASE.md`、`docs/API.md`、`README.md` 已同步。

---

## 3. 数据库结构变化

全部为非破坏性变更，无 `DROP`、无 `TRUNCATE`、无数据清空。

### 3.1 `laboratories` 新增列

`lab_code`（VARCHAR + UNIQUE）、`college`、`location`、`detail`、`research_direction`、`features`、`achievements`、`equipment`、`contact`、`remark`。

### 3.2 `lab_teachers` 新增列

`employee_no`、`gender`、`degree`、`project`、`email`、`office`、`photo_url`、`remark`、`identity`、`deleted_at`。

### 3.3 新增表

| 表 | 用途 |
| --- | --- |
| `lab_yearly_plans` | 实训室学年招生总名额（`laboratory_id` + `academic_year` 唯一） |
| `teacher_yearly_quotas` | 教师学年名额（`teacher_id` + `academic_year` 唯一） |
| `lab_promotion_files` | 宣传资料元数据（存储键、类型、大小、上传者、时间） |

### 3.4 兼容与迁移

- JSON 文件库（默认）：`seed.js` 的 `emptyStore()` / `migrateStore()` 自动补齐三张空集合与新字段默认值；历史数据的「大写编号式名称」被识别为 `labCode`，教师 `identity` 按是否担任组长推断。
- MySQL 路径：`migration_v10.sql` 已注册进 `backend/data/mysql.js` 的 `prerequisiteMigrations`，启动时按序执行。适配层沿用「整表同步 + 未知字段落 `extra_json`」，旧库不会被推平。
- 重要写操作（名额保存、教师增删、文件记录）均为「先校验、后一次性落库」，批量同步走同一事务边界。

---

## 4. 新增 / 修改 API

新路由前缀 `/api/lab-profiles`（18 个）：

| 方法 | 路径 | 权限 |
| --- | --- | --- |
| GET | `/overview` | 登录；组长仅返回本室 |
| GET | `/labs/:id` | 学院 / 本室 |
| POST | `/labs` | 学院 |
| PUT | `/labs/:id` | 学院 |
| GET | `/labs/:id/teachers` | 学院 / 本室 |
| POST | `/labs/:id/teachers` | 学院 |
| PUT | `/labs/:id/teachers/:teacherId` | 学院 |
| DELETE | `/labs/:id/teachers/:teacherId` | 学院（软删除） |
| PUT | `/labs/:id/leader` | 学院 |
| GET | `/labs/:id/quotas` | 学院 / 本室 |
| PUT | `/labs/:id/plan` | 学院 |
| PUT | `/labs/:id/teacher-quotas` | 学院 |
| GET | `/files` | 学院（全院） |
| GET | `/labs/:id/files` | 学院 / 本室 |
| POST | `/labs/:id/files` | 学院 / 本室 |
| GET | `/files/:fileId/download` | 学院 / 本室 |
| GET | `/files/:fileId/preview` | 学院 / 本室 |
| DELETE | `/files/:fileId` | 学院 / 本室 |

修改的既有接口：

- `GET /api/laboratories`、`GET /api/laboratories/:id`：补 12 个学院维护字段；`recruitmentQuota` 改按当前学年计算。
- `PUT /api/laboratories/:id`：组长仅可写 6 个媒体字段，其余 403；学院可写全部并新增名额校验。
- 导师团队增删改：权限从 `isLabLeader` 收紧为 `COLLEGE_ADMIN`。

---

## 5. 新增页面

| 路由 | 页面 |
| --- | --- |
| `/college/lab-materials` | 实训室资料管理（总览） |
| `/college/lab-materials/:id` | 实训室资料详情（基础资料 / 教师管理 / 招生名额 / 宣传资料） |

菜单入口：学院端「全院总览」→「实训室资料管理」。

---

## 6. 权限变化

| 能力 | 改造前 | 改造后 |
| --- | --- | --- |
| 改实训室名称/编号/位置/介绍 | 组长可改 | 仅学院 |
| 增删改教师 | 组长可改 | 仅学院 |
| 设置教师身份/所属室 | 组长可改 | 仅学院 |
| 招生总名额 / 教师名额 / 学年计划 | 组长可改 | 仅学院，组长只读 |
| 宣传资料上传/删除 | 组长可改 | 组长保留（限本室） |
| 报名、面试、线上、记录、筛选、调剂 | 组长可用 | 不变 |
| 教师账号绑定可见性 | 所有人可见 | 仅学院与本室成员 |

后端真实生效：所有判定在 `requireAuth` + `activeRole` 上做，前端隐藏只是体验层，直接构造请求同样被拒（测试用例已覆盖 `403`）。

---

## 7. 账号初始化结果

七个账号全部 `ACTIVE`、`mustChangePassword = true`、角色与实训室归属正确（详见 1.7 表格）。已用 `--reset-passwords` 复位到初始密码。**数据库内无明文密码字段。**

旧账号清理**尚未执行**，等确认（见第 10 节）。

---

## 8. 测试结果

```
backend/npm test              → 通过 105  失败 0
backend/npm run test:flow     → 通过  41  失败 0
backend/npm run test:profile  → 通过  50  失败 0
frontend/npx vue-tsc --noEmit → 无错误
```

所有测试跑在独立数据副本（`LAB_STORE_FILE` + 独立端口）上，不污染开发库。

`test:profile` 覆盖：总览聚合、基础资料读写、编号唯一冲突、组长越权 403、教师增改删与账号绑定脱敏、名额负值 400 / 超额 409 / 低于已分配 409 / 学年隔离、宣传资料上传下载与非法类型拒绝、学生端读最新资料、未登录 401。

页面人工验证（截图存 `.screenshots/`）：`m1-overview.png`（总览）、`m3-505-teachers.png`（教师管理）、`n2-505-quotas.png`（名额分配）、`p1-leader-labinfo.png`（组长端只读）、`p2-leader-files.png`（组长端宣传资料上传）。

---

## 9. 未完成 / 受限内容

1. **MySQL 路径未实测**：本机无 MySQL 实例，`migration_v10.sql` 只做了语法检查与注册，未跑真实迁移。JSON 文件库路径已全量实测。
2. **PR 未创建**：`main` 有分支保护，本机无 `gh` CLI。需手动创建：<https://github.com/sjhoaidjaoi/lab_match/pull/new/feature/workspaces-and-college-pages>
3. **教师端（`LAB_TEACHER`）页面未逐一走查**：数据口径已同源（读 `/api/laboratories`），但 `TeacherLabInfo.vue` 的展示细节未按新字段做视觉验收。
4. **实训室物理删除入口未开放**：需求要求「有业务数据不得物理删除」，当前一律不提供删除，仅保留软删除能力。
5. **旧账号清理未执行**：等确认。
6. **宣传资料 200MB 上限**：超过会返回 `413`，前端已提示，但未做分片上传。

---

## 10. 需要你手动操作 / 确认的事项

### 10.1 旧账号清理（需明确确认）

`npm run accounts:report` 输出的影响范围：

**A. 无任何关联业务记录，可直接删除（2 个）**

- `admin`（张老师，学院负责人）
- `T2001`（演示教师，实训室教师）

**B. 存在关联业务记录，只能停用 / 解除登录权限，不得删除（5 个）**

| 账号 | 姓名 | 关联记录数 | 明细 |
| --- | --- | --- | --- |
| `L001` | 李敏 | 11 | 教师档案 1、操作日志 10 |
| `T1001` | 王强 | 2 | 面试记录（面试官）1、教师档案 1 |
| `2022001` | 演示学生 | 3 | 招生志愿 1、面试记录 1、操作日志 1 |
| `college` | 演示学院管理员 | 28 | 操作日志 28 |
| `T3001` | 刘嘉亮 | 1 | 操作日志 1 |

**C. 本次保留（7 个）**：`rjxyrjxy` + `rjxy@202/204/402/404/406/505`

报告中未修改任何数据。**确认后我再执行**：A 组硬删除，B 组置 `status='INACTIVE'` + `credentialVersion++`（旧 JWT 立即失效）。

### 10.2 安全提醒

`backend/.env` 中有真实 `LIVEKIT_API_SECRET`。该文件已被 `.gitignore` 忽略、未入库，但建议轮换一次；已提交的 `backend/.env.example` 只含空值占位。

### 10.3 其他

- 创建 PR 后请勿直接推 `main`（会被 GH013 拒绝）。
- 若需在 MySQL 上验证，需先配 `DB_DRIVER=mysql` 与连接串，再跑一次 `npm run init:college`。
