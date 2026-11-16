# 软件学院学生实训室双向选拔与统筹调剂管理平台

面向软件学院实训室进组选拔的全流程管理系统，覆盖四种角色与八个业务阶段，前后端数据闭环，支持从志愿填报到正式入组的完整选拔流程。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | Vue 3 + TypeScript + Vite + Element Plus + Pinia |
| 后端 | Node.js + Express + JWT + bcryptjs + zod |
| 数据 | 默认 JSON 文件存储（`backend/data/.store.json`）；可切换 MySQL 8（`DB_DRIVER=mysql`），DDL 与迁移见 `database/` |
| 导出 | SheetJS（xlsx） |

> 说明：仓库中另保留早期 Spring Boot 骨架（`backend/pom.xml`、`backend/src/main/java`）与 `V2/` 参考目录，当前实际运行入口为 `backend/app.js` 与 `frontend/`，请勿混用。

## 功能概览

- 四种角色独立工作台：学生、实训室教师、实训室组长、学院总负责人。
- 八阶段：集中宣讲 → 开放日 → 意向填报 → 导师初选与面试 → 拟录取确认 → 内部调剂 → 统筹调剂 → 公示与正式入组。
- 后端 RBAC：角色来自账号数据，忽略伪造 `X-Role`；教师/组长按 `laboratoryId` 做实训室数据隔离。
- 核心规则：最多 3 个平行志愿、截止自动锁定、单意向自动确认、多意向学生选择、名额释放与递补、调剂去重、防超额/重复录取、公示异议、批量入组。
- 学院端：批次/阶段、学生、实训室、宣讲、开放日、志愿、面试、拟录取、确认、空缺、候选、内部/跨室调剂、安置、最终名单、公示、统计、日志。
- 教师端：工作台、本室信息、报名学生、面试排期与五维评分、LiveKit 线上面试、确认进度、小组成员。
- 组长端：工作台、选拔汇总、确认进度、内部调剂、补录统筹、名额上报。
- 学生端：工作台、志愿填报、面试、拟录取确认、调剂确认、公示异议、消息、实训室资料、宣讲、开放日、个人中心。
- 公共能力：帮助中心（按角色展示八阶段操作指引与 FAQ）、个人信息与密码修改、系统公告、站内文件上传（图片/视频/PDF）、操作日志、服务端分页、Excel 导出。

## 目录结构

```text
lab_match/
├── frontend/           Vue 3 前端
├── backend/            Node.js + Express 后端（app.js 为启动入口）
│   ├── routes/         业务接口
│   ├── middleware/     鉴权与角色/数据范围
│   ├── data/           种子数据与运行期数据
│   ├── utils/          响应、JWT、审计日志
│   └── tests/          接口冒烟测试
├── database/           MySQL schema 与迁移脚本
├── docs/               需求审查、修复记录、测试报告、接口、数据库文档
└── docs-framework/     早期联调约定
```

## 环境要求

- Node.js 20+（推荐 22/24）
- npm 8+
- 可选：MySQL 8（仅生产部署时需要）

## 启动方式

### 1. 后端

```powershell
cd backend
npm install
npm start
```

- 地址：`http://localhost:8080`
- 健康检查：`GET http://localhost:8080/api/health`
- 新数据源默认只初始化 **505 实训室**。首次建库前可在 `backend/.env` 中设置 `LAB_ADMIN_PASSWORD`（至少 8 位，不超过 72 字节），同时创建学院管理员 `admin`。已有数据继续使用原账号。

开发模式（文件变更自动重启）：

```powershell
npm run dev
```

### 2. 前端

```powershell
cd frontend
npm install
npm run dev
```

访问 `http://localhost:5173`。Vite 已将 `/api` 代理到 `http://localhost:8080`。

线上面试需要配置 LiveKit Cloud。参见[线上面试配置、迁移及验收](docs/ONLINE_INTERVIEWS.md)。
录制、私有存储和档案的设置见[面试录制与档案](docs/INTERVIEW_RECORDINGS.md)。

生产构建：

```powershell
npm run build
npm run preview
```

## 独立演示环境

如需联调演示，在启动前设置 `LAB_SEED_DEMO=true` 并指定一个新的 `LAB_STORE_FILE`（MySQL 则使用独立空库）。演示初始化只在数据源为空时运行。以下账号属于独立演示环境。

| 角色 | 账号 | 密码 |
| --- | --- | --- |
| 学生 | 2022001（及 2022002–2022012） | 123456 |
| 实训室教师 | T1001 / T1002 / T1003 | 123456 |
| 实训室组长 | L001 | 123456 |
| 学院总负责人 | admin | 123456 |

> 演示密码仅用于本地验收，生产环境必须修改并设置强随机 `JWT_SECRET`。

## 数据库初始化（MySQL，可选）

默认使用文件存储即可完整运行。切换 MySQL：

```powershell
cd backend
# 在 backend/.env 中配置：
# DB_DRIVER=mysql
# MYSQL_HOST=127.0.0.1
# MYSQL_PORT=3306
# MYSQL_USER=root
# MYSQL_PASSWORD=你的密码
# MYSQL_DATABASE=lab_match

npm run db:init    # 新建库表或执行 v2–v9 增量迁移（可重复执行）
npm run db:check   # 检查连接与各表数据量
npm start          # /api/health 的 data.storage 应返回 mysql
```

已有 MySQL 数据库使用上述增量迁移命令。详见[数据库设计说明](docs/DATABASE.md)及[线上面试迁移](docs/ONLINE_INTERVIEWS.md)。

## 测试

后端接口冒烟测试（使用独立数据副本，不修改演示数据）：

```powershell
cd backend
npm test
npm run test:flow
npm run test:video
```

前端类型检查与构建：

```powershell
cd frontend
npm run build
```

历次回归记录见[测试报告](docs/TEST_REPORT.md)。

## 文档

- [需求符合度审查报告](docs/REQUIREMENTS_AUDIT.md)
- [问题修复记录](docs/REQUIREMENTS_FIX_LOG.md)
- [测试与回归报告](docs/TEST_REPORT.md)
- [接口文档](docs/API.md)
- [数据库设计说明](docs/DATABASE.md)

## 已知限制

- 默认 JSON 文件存储为单进程串行写入；多实例部署需切换 MySQL 数据源。
- MySQL 数据源已实现（加载/事务同步/迁移脚本），但当前环境无 MySQL 实例，实机验证待部署环境执行。
- 宣讲视频、全景、开放日图片等演示数据未内置真实素材，可由学院通过站内上传或外部链接补充。
- 服务端分页已覆盖学生列表与操作日志，其余长列表仍为前端分页。
- 移动端已补响应式断点，尚未做真机逐页走查。
- 自动调剂匹配算法、面试地点/形式、超时确认口径、公示最短时长等规则待学院确认。
