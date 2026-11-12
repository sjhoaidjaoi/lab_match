# 整体集成与预留说明（INTEGRATION）

> 目标：教师端 / 组长端不再“等接口”，而是**先把契约冻结、把替换点留好**。
> 别人交付时，按本文件的“替换点”一处处换掉 Mock 即可，页面不用重写。

---

## 1. 总原则

1. **后端是唯一事实来源**：名额、确认状态、审核结果、日志，前端只读展示，不自行推算。
2. **契约先冻结**：字段、枚举、错误码改一次要双端同步（`docs/API.md` + 两端 `constants/enums.js`）。
3. **未实现接口返回 501**，不返回 404/空对象，避免前端猜字段。
4. **所有写接口服务端二次校验**：阶段、角色、实训室范围、名额、锁状态。
5. **时间统一 ISO 8601**（带时区），前端展示可本地化。
6. **幂等**：提交、确认、放弃这类动作支持 `Idempotency-Key`，重复请求返回同一结果。
7. **并发**：名单类数据带 `version` / `updatedAt`，提交时校验，冲突返回 `409 LIST_LOCKED`。

---

## 2. 依赖矩阵（谁提供 / 现在用什么 / 换哪里）

| # | 依赖 | 提供方 | 当前替代 | 接口 | 前端替换点 |
|---|---|---|---|---|---|
| 1 | 登录、JWT、角色、`laboratoryId` | 公共模块 | `/login?as=leader` 演示直达 | `POST /api/auth/login`、`GET /api/auth/me` | `stores/auth.js` 的 `login()` |
| 2 | 阶段时间与当前阶段 | 学院端 | 固定演示时间 + `mock/stages.js`（可 `VITE_STAGE_SYNC` 同步） | `GET /api/meta/stage` | `stores/stage.js` 的 `current / canWrite` |
| 2.1 | 批次与规则开关（Q6/Q7/Q8） | 学院端 / 公共 | 前端写死默认规则 | `GET /api/meta/batches`、`GET /api/meta/config`（已可用） | `mock` 默认值 → `stores/config.js`（待建） |
| 3 | 学生志愿与基本信息 | 学生端 | `mock/students.js`、`mock/applications.js` | `GET /api/teacher/applications`、`/:studentId` | `views/teacher/applications` 的数据源 |
| 4 | 学生确认 / 放弃 | 学生端 | 确认页“模拟确认 / 模拟超时放弃” | `POST /api/student/admissions/:id/confirm|abandon` | `stores/room.js` 的 `confirmIntention / abandonIntention` |
| 5 | 学院审核通过 / 退回 | 学院端 | `/demo/review` 审核演示台（读写同一份提交快照） | `POST /api/admin/submissions/:id/approve|reject` | `stores/submission.js` 的 `review(labId, action, reason)` |
| 6 | 实训室名额调整 | 学院端 | `mock/labs.js` 静态名额 | `PUT /api/admin/labs/:id/quota` | `mock/labs` → `GET /api/teacher/dashboard` |
| 7 | 文件与简历附件 | 公共模块 | 附件“查看”提示占位 | `POST /api/files`、`GET /api/files/:id` | `ApplicationsView.onViewFile` |
| 8 | 操作日志落库 | 后端 | `stores/logs.js` 本地 200 条 | 写接口内部写 `operation_logs`，`GET /api/teacher/room/logs` | `stores/logs.js` 的 `record()` |
| 9 | 消息通知 | 公共模块 | 无 | `GET /api/notifications`（已占位） | `api/notification.js`（未接入页面） |
| 10 | Excel / 报表导出 | 后端 | 前端 CSV | `GET /api/exports/...` | `utils/exportCsv.js` |

---

## 3. 已就绪的“可对接”部分

| 能力 | 状态 | 位置 |
|---|---|---|
| 枚举单一来源 | ✅ 双端各一份，后端可下发 | `backend/src/constants/enums.js`、`GET /api/meta/enums` |
| 阶段模板 | ✅ 后端可下发，前端仍用本地 mock | `GET /api/meta/stages` |
| 教师端写接口契约 | ✅ 路由已挂、鉴权已加、实现待填 | `backend/src/routes/teacher.routes.js` |
| 学生端接口占位 | ✅ 501 + 契约说明 | `backend/src/routes/student.routes.js` |
| 学院端接口占位 | ✅ 501 + 契约说明 | `backend/src/routes/admin.routes.js` |
| 文件接口占位 | ✅ 501 + 契约说明 | `backend/src/routes/file.routes.js` |
| 前端 API 封装 | ✅ 按域拆分，页面暂未调用 | `frontend/src/api/*.js` |
| 提交快照 | ✅ 结构化 JSON，可直接当请求体 | `stores/submission.js` 的 `payload` |

后端当前**不依赖数据库即可启动**，方便先联调契约：

```bash
export PATH="$HOME/.local/node/bin:$PATH"
cd backend && npm install && npm run dev
curl http://localhost:3000/api/meta/enums
```

---

## 4. 推荐替换顺序（L2 联调）

1. **登录**：`/auth/login` 返回 token 与 `laboratoryId` → 改 `stores/auth.js`；
2. **阶段**：拉取真实阶段 → 打开 `VITE_STAGE_SYNC=true`，前端只展示；
3. **报名 / 面试 / 评价**：`mock/*` → `api/teacher.js`；
4. **拟录取 / 递补 / 确认**：`room` store 的 localStorage → 接口；
5. **内部调剂 / 提交审核**：`payload` 直接 POST，状态由后端返回；
6. **日志与文件**：本地 `logs` store → 后端查询；附件预览走 `/files/:id`。

每一步只改 store 内部实现，页面与组件不动；`npm run smoke` 仍然应该全绿（store 对外行为不变）。

---

## 5. 变更规则（避免返工）

- 新增字段：先改 `docs/API.md`，再改双端 `constants/enums.js`（若涉及枚举），最后改页面；
- 删除/重命名字段：必须同时更新 `docs/DATABASE.md` 与 `mock/*`，并补一条 smoke 断言；
- 状态机新增状态：`StatusTag` 的 `STATUS_META` 必须补中文标签，否则页面会显示英文；
- 任何人不得在前端自行计算“超时放弃”“空缺名额”“审核通过”，这些只能是后端结果。

---

## 6. 当前明确的“不实现”

| 项 | 原因 | 预留位置 |
|---|---|---|
| 真实文件上传 | 无对象存储 / 后端文件服务 | `api/file.js`、附件按钮 |
| 消息通知 | 公共模块未定 | `api/meta.js` 旁可加 `api/notification.js` |
| 多实训室 | 已实现一人一室；真实授权列表待登录返回 | `stores/auth.js` 已存 `laboratoryId` |
| Excel 导出 | 前端先给 CSV | `utils/exportCsv.js` |
| 跨室统筹调剂 | 学院端职责 | `admin` 路由占位 |
