# lab_match · 软件学院学生实训室双向选拔与统筹调剂管理平台

面向学院实训室进组选拔的全流程平台：**双向选择 · 分轮录取 · 统筹调剂**。

## 技术栈

| 层 | 选型 |
| --- | --- |
| 前端 | Vue 3 + TypeScript + Vite + Element Plus + Pinia + Vue Router |
| 后端 | **Node.js + Express 4**（JWT + Zod + bcryptjs + mysql2） |
| 数据库 | MySQL 8.0（utf8mb4） |

> 后端采用 Express RESTful API + JWT + RBAC，严格按新文档 V1.0 技术栈建议重构为 Node.js 技术栈。

## 目录结构（严格对齐新文档 7.5 节）

```
lab_match/
├── backend/                  # Node.js + Express 后端
│   ├── package.json
│   ├── app.js                # 入口
│   ├── config/database.js   # MySQL 连接池
│   ├── middleware/           # auth（JWT + RBAC）、error
│   ├── routes/               # 10 个路由模块（auth / batches / laboratories / preferences / interviews / admissions / adjustments / final / media / announcements / notifications / logs）
│   ├── controllers/          # （预留，后续业务复杂时拆分）
│   ├── services/             # （预留）
│   ├── models/               # （预留，MySQL 接入时用）
│   ├── utils/                # result、hash
│   ├── data/seed.js          # Mock 数据层（10 张核心表 + 辅助表）
│   └── uploads/              # 上传目录
├── database/                 # 数据库脚本（新文档独立出来）
│   ├── schema.sql            # 10 张核心表 + 辅助表 CREATE TABLE
│   └── seed.sql              # 演示种子数据
├── frontend/                 # Vue 3 前端
│   └── src/
│       ├── api/              # 按 Express 路由拆分的接口封装
│       ├── components/       # Workbench / StageBanner / PageStub / 媒体组件
│       ├── config/           # stages（八阶段 + 角色枚举）、workbenches
│       ├── layouts/AppLayout.vue
│       ├── router/           # 路由 + 按角色的菜单（menus.ts）
│       ├── stores/           # auth、cycle
│       ├── types/            # 全量 TypeScript 类型
│       └── views/
│           ├── Login.vue
│           ├── student/      # 学生端
│           ├── teacher/      # 实训室教师端（原 mentor → 新文档 LAB_TEACHER）
│           ├── leader/      # 实训室组长端（新文档 LAB_LEADER）
│           └── admin/        # 学院总负责人端（新文档 COLLEGE_ADMIN）
├── docs/requirements/       # 原始需求文档归档
└── README.md
```

## 快速启动

### 1. 安装依赖

```bash
# 后端
cd backend
npm install

# 前端
cd frontend
npm install --registry=https://registry.npmmirror.com
```

> 国内 npm registry 建议使用 `https://registry.npmmirror.com`（npmjs.org 在部分网络下不可达）。

### 2. 启动后端（Mock 模式，无需 MySQL）

Express 后端默认使用文件化 Mock 数据（`backend/data/.store.json`），首次启动自动生成。

```bash
cd backend
npm start          # 或 node app.js
```

后端监听 `http://localhost:8080`，健康检查：

```
GET /api/health -> { code: "OK", data: { status: "UP" } }
```

**如需接入真实 MySQL**：

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p -e "use lab_match; source database/seed.sql"

# 然后设置环境变量启动
DB_HOST=localhost DB_PORT=3306 DB_USER=root DB_PASSWORD=root DB_NAME=lab_match npm start
```

### 3. 启动前端

```bash
cd frontend
npm run dev
```

访问 http://localhost:5173 ，Vite 已代理 `/api` → `http://localhost:8080`。

## 演示账号（密码均为 `123456`）

严格对齐新文档 2.x + 5.1 节四种核心角色：

| 角色 | 账号 | 说明 |
| --- | --- | --- |
| 学生 | `2022001` / `2022002` / `2022003` | 陈晨 / 林小雨 / 周航 |
| 实训室教师 | `T1001` / `T1002` | 王强 / 赵雪（LAB_TEACHER 角色） |
| 实训室组长 | `L001` | 李敏（LAB_LEADER，可切换到 LAB_TEACHER） |
| 学院总负责人 | `admin` | 张老师（COLLEGE_ADMIN） |

> LAB_LEADER 账号可以通过"角色切换"切换到 LAB_TEACHER 视角，体现文档 2.3 节"组长同时也是实训室教师"的设计。

## 八阶段流程

严格对齐新文档第三章定义：

| 阶段 | key | 后端接口前缀 | 前端路径 |
| --- | --- | --- | --- |
| ① 集中宣讲 | BRIEFING | `/api/media/videos` `/api/announcements` | `/student/briefing` |
| ② 实训室开放日 | OPEN_DAY | `/api/media/panoramas` | `/student/open-day` |
| ③ 学生意向填报 | PREFERENCE | `/api/preferences/submit` | `/student/preferences` |
| ④ 导师初选与面试考核 | INTERVIEW | `/api/interviews/*` | `/teacher/interviews` |
| ⑤ 拟录取与学生确认 | ADMISSION_CONFIRM | `/api/admissions/*` | `/student/admission` |
| ⑥ 实训室内部调剂 | INTERNAL_SUPPLEMENT | `/api/adjustments/internal` | `/leader/internal` |
| ⑦ 学院统筹调剂 | COLLEGE_ADJUSTMENT | `/api/adjustments/cross` | `/admin/adjustments` |
| ⑧ 结果公示与正式入组 | FINAL_PUBLICITY | `/api/final/*` | `/admin/publication` |

## 统一 API 约定

- **返回格式**：`{ code: "OK", message: "ok", data: ... }`
  - 成功 `code = "OK"`；失败为字符串错误码（见 `backend/utils/result.js` ResultCode）
- **登录**：`POST /api/auth/login`，请求体 `{ "username": "2022001", "password": "123456" }`
- **鉴权**：后续请求携带 `Authorization: Bearer <token>`
- **多角色切换**：`POST /api/auth/switch-role`，请求体 `{ "roleCode": "LAB_TEACHER" }`
- **角色声明**：请求头 `X-Role: LAB_LEADER`（多角色账号需指定当前角色；服务端每请求校验）

## 数据库设计（10 张核心表）

严格对齐新文档 5.1 ~ 5.10 节：

| # | 表名 | 说明 |
| --- | --- | --- |
| 5.1 | `users` | 用户（四种角色：STUDENT / LAB_TEACHER / LAB_LEADER / COLLEGE_ADMIN） |
| 5.2 | `laboratories` | 实训室（含 leader_id 关联 users） |
| 5.3 | `recruitment_batches` | 选拔批次 |
| 5.4 | `recruitment_stages` | 八阶段时间窗 + 状态（NOT_STARTED / IN_PROGRESS / COMPLETED / PAUSED） |
| 5.5 | `student_preferences` | 学生志愿（最多 3 个平行志愿 + 2 项调剂意愿） |
| 5.6 | `interviews` | 面试记录（5 维度评分 + 评语 + 建议） |
| 5.7 | `admission_intentions` | 拟录取 / 递补（INTENDED / ALTERNATE） |
| 5.8 | `adjustments` | 调剂（INTERNAL / CROSS_LAB / MANUAL_PLACEMENT） |
| 5.9 | `final_admissions` | 最终录取 |
| 5.10 | `operation_logs` | 操作日志 |

辅助表：`media_videos`（宣讲视频）、`media_panoramas`（720° 全景）、`announcements`、`notices`、`publication`。

完整 DDL 见 [database/schema.sql](database/schema.sql)。

## 团队分工建议

| 小组 | 负责范围 | 后端路由前缀 | 前端路径 |
| --- | --- | --- | --- |
| 基础设施组 | Express 骨架、鉴权、阶段机、联调部署 | `/api/auth` `/api/batches` `/api/logs` | `router/` `layouts/` `stores/` |
| 学生端组 | 宣讲、开放日、志愿、面试、录取、结果 | `/api/media` `/api/preferences` | `views/student/*` |
| 实训室教师端组 | 面试评价、拟录取、确认、最终名单 | `/api/interviews` `/api/admissions` | `views/teacher/*` |
| 实训室组长端组 | 汇总、内部调剂 | `/api/adjustments` | `views/leader/*` |
| 学院管理端组 | 批次、账号、全院调剂、公示、最终名单 | `/api/final` `/api/adjustments` `/api/batches` | `views/admin/*` |

每个占位页面顶部已标注所属阶段与待实现清单；后端未实现的接口统一返回 `NOT_IMPLEMENTED` 错误码并带 TODO 注释，便于直接接手。

## 后续开发阶段规划

严格对齐新文档第十章：

| 阶段 | 开发目标 | 状态 |
| --- | --- | --- |
| 第一阶段 | 完成系统骨架和四端页面 | ✅ 已完成（本次） |
| 第二阶段 | 完成数据库设计及后端基础接口 | ✅ schema.sql + seed.sql 已就绪 |
| 第三阶段 | 完成账号、角色和权限管理 | ✅ JWT + RBAC 已就绪 |
| 第四阶段 | 完成集中宣讲、开放日及全景展示 | ✅ Mock 数据已接入 |
| 第五阶段 | 完成学生志愿填报 | 🔄 路由/接口已就绪，需业务打磨 |
| 第六阶段 | 完成教师面试与考核管理 | 🔄 |
| 第七阶段 | 完成拟录取与学生确认 | 🔄 |
| 第八阶段 | 完成实训室内部调剂 | 🔄 |
| 第九阶段 | 完成学院跨实训室统筹调剂 | 🔄 |
| 第十阶段 | 完成最终名单、公示及数据导出 | 🔄 |
| 第十一阶段 | 联调、测试和系统优化 | ⏳ |

## 文档索引

- [新文档 V1.0（本项目实现依据）](docs/requirements/软件学院学生实训室双向选拔与统筹调剂管理平台.md)
- 原始归档：[01-需求PRD.md](docs/requirements/01-需求PRD.md) · [02-技术架构.md](docs/requirements/02-技术架构.md) · [03-系统设计文档-v3.md](docs/requirements/03-系统设计文档-v3.md) · [04-项目执行方案.md](docs/requirements/04-项目执行方案.md)
