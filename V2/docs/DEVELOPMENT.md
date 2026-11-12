# 开发与协作说明 V0.1

## 目录

```text
training-room-selection/
├── frontend/   Vue3 + Vite + Element Plus（骨架已完成教师/组长两端）
├── backend/    Express 骨架，services 返回 Mock，接口已按 docs/API.md 挂好
├── database/   schema.sql（10 张表 + 2 处结构调整）+ seed.sql
└── docs/       REQUIREMENTS.md 副本、API.md、DATABASE.md、本文件
```

## 启动前端

```bash
cd frontend
npm install          # 需要 Node 18+
npm run dev          # http://localhost:5173
```

> 当前机器的系统 PATH 里没有 Node.js，已在用户目录装了一份免安装版：
>
> ```bash
> export PATH="$HOME/.local/node/bin:$PATH"
> node -v   # v20.18.1
> ```
>
> 想长期生效可写入 `~/.bashrc`。npm 源已设为 `registry.npmmirror.com`。
> 如需系统级安装：`sudo apt install -y nodejs npm`（候选 18.19.1）。
>
> 本骨架已实际执行 `npm install && npm run build` 并通过（vite 构建 ~4s）。

## 启动后端

```bash
cd backend
npm install
npm run dev          # http://localhost:3000/api/health
```

骨架阶段后端不连接 MySQL，`config/db.js` 仅提供连接池工厂。

## 演示登录

打开 `/login`，直接点角色卡片进入，无需密码：

| 角色 | 入口 |
|---|---|
| 学生 | /student/dashboard（占位） |
| 实训室教师 | /teacher/dashboard |
| 实训室组长 | /teacher/room/dashboard（多出「本室统筹」菜单） |
| 学院负责人 | /admin/dashboard（占位） |

**组长不是第二个登录入口**：同一账号体系，组长 = 教师权限 + `LAB_LEADER` 额外菜单；
普通教师直接访问 `/teacher/room/**` 会被路由守卫拦到 `/403`。

## 分工边界

| 负责人 | 目录 | 说明 |
|---|---|---|
| 教师/组长端 | `src/views/teacher/**`、`src/mock/**`、`src/config/menus.js` | 本次骨架主体 |
| 公共模块 | `src/layouts`、`src/router`、`src/stores/auth.js`、`views/login` | 已提供，后续接真实 JWT |
| 学生端 | `src/views/student` | 当前占位，替换 `PlaceholderView` 即可 |
| 学院端 | `src/views/admin` | 同上 |
| 后端 | `backend/src/**` | 按 API 契约实现，保持字段不变 |

## 骨架阶段约定

1. 页面禁止直接写死 `laboratoryId`，一律从 `useAuthStore()` 取。
2. 学生确认状态只读，前端不得自行推算「超时放弃」。
3. 名额、空缺等数字统一由后端返回，前端只负责展示。
4. 待确认业务规则（Q6/Q7/Q8）必须做成配置开关，不能硬编码。

## 数据自洽冒烟测试

改动 `src/mock/**` 或 `src/stores/room.js` 后执行：

```bash
cd frontend
npm run smoke
```

脚本用 Vite SSR 直接加载真实 store，校验名额/拟录取/确认/空缺/候选数量、
名额上限拦截、理由必填、递补顺位重排、提交审核状态机与持久化。

## 数据规模（2026-11 更新）

- 400 名学生，每人 3 个平行志愿；6 间实训室，每室 4~5 名教师，每人名额 16。
- 演示室为 lab 1：报名 199、名额 64、已确认 56、空缺 8、递补 12、调剂候选 24。
- 面试记录 199 条，其中 139 条已评价、60 条待评价（70% 完成率）。
- 数据入口：`mock/applications.js` 的 `applicationsOf(labId)`、`mock/interviews.js` 的 `interviewsOf(labId)`。
