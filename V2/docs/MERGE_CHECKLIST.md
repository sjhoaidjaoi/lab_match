# 合并前检查清单（MERGE CHECKLIST）

> 目的：确认教师端 / 组长端在**不依赖其他端**的前提下已经做到位，代码可以并入团队仓库。
> 判断依据：`docs/REQUIREMENTS.md` + 桌面流程图，而不是“还能加什么”。

---

## 1. 范围声明

本次交付范围：**实训室教师端 + 实训室组长端**（同一工作台，组长为增量权限）。
学生端、学院端、文件服务、真实登录属于其他人/其他阶段，只提供契约与占位。

---

## 2. 一键验证

```bash
export PATH="$HOME/.local/node/bin:$PATH"

# 前端
cd frontend
npm ci                 # 或 npm install
npm run build          # 必须通过
npm run smoke          # 234 项断言，必须全 PASS

# 后端（无需数据库）
cd ../backend
npm install
DEMO_STAGE_NO=6 npm run dev
curl http://localhost:3000/api/health
curl http://localhost:3000/api/meta/enums
curl http://localhost:3000/api/meta/stage
```

---

## 3. 合并前必须满足

- [ ] `git status` 干净，没有未提交改动
- [ ] `npm run build` 通过
- [ ] `npm run smoke` 全绿
- [ ] 后端可启动，`/api/health`、`/api/meta/*` 正常
- [ ] 没有提交 `node_modules`、`dist`、`.env`、本地 localStorage 数据
- [ ] `docs/HANDOFF.md`、`docs/API.md`、`docs/ROADMAP.md` 与本轮代码一致
- [ ] 组长专属页面仍被 `meta.roles = ['LAB_LEADER']` 守卫
- [ ] 写操作仍是三层防护：阶段门禁 → 提交锁定 → 函数内守卫（后端再加服务端校验）

---

## 4. 大纲覆盖自检（教师 / 组长）

| 大纲能力 | 位置 | 状态 |
|---|---|---|
| 本室信息、按授权编辑 | `teacher/lab/LabInfo.vue` | ✅ |
| 报名名单、志愿、调剂意愿、导出 | `teacher/applications/ApplicationsView.vue` | ✅ |
| 面试安排（按学生、冲突校验、改期、取消） | `teacher/interviews/InterviewsView.vue` | ✅ |
| 五维评分、评价、建议、缺勤 | `teacher/interviews/EvaluateView.vue` | ✅ |
| 拟录取 / 递补、顺位、名额校验、导出 | `teacher/admissions/AdmissionsView.vue` | ✅ |
| 录取确认、剩余名额 | `teacher/confirmations/ConfirmationsView.vue` | ✅ |
| 最终名单、导出 | `teacher/final/FinalListView.vue` | ✅ |
| 组长：全室教师评价、按学生聚合 | `teacher/leader/LeaderInterviews.vue` | ✅ |
| 组长：内部调剂 5 步、名额/理由/确认 | `teacher/leader/AdjustmentsView.vue` | ✅ |
| 组长：提交学院审核、锁定、退回重提 | `teacher/leader/SubmitReview.vue` | ✅ |
| 操作留痕、按室筛选、导出 | `teacher/leader/OperationLogs.vue` | ✅ |
| 一人一室（不切室） | 25 个账号 + 按 `laboratoryId` 取数 | ✅ |
| Q6/Q7/Q8 规则可配 | `teacher/leader/RuleSettings.vue` + `/meta/config` | ✅ |
| 通知（确认/放弃/审核结果） | 顶栏通知 + `stores/notifications` | ✅ 演示 |
| 学院审核闭环 | `/demo/review` + `submission.review()` | ✅ 演示 |

---

## 5. 明确的“不在这里做”（有依赖，已留契约）

| 事项 | 依赖 | 契约/位置 |
|---|---|---|
| 真实登录 / JWT 签发 | 公共模块 | `api/auth.js`、`backend/routes/auth.routes.js` |
| 学生确认 / 放弃的真实写入 | 学生端 | `api/student.js`、`backend/routes/student.routes.js` |
| 学院审核真实接口 | 学院端 | `api/admin.js`、`backend/routes/admin.routes.js` |
| 文件/简历附件上传预览 | 公共模块 + 存储 | `api/file.js`、`database/schema_reserved.sql#files` |
| 消息推送 | 公共模块 | `api/notification.js`、`notifications` 预留表 |
| 跨室统筹调剂 | 学院端 | `admin` 路由占位 |
| Excel 导出 | 后端 | `utils/exportCsv.js` 暂代 |

**这些不是“没做完”，而是不在本次分工范围内；页面与 store 已经留好替换点。**

---

## 6. 合并步骤（团队仓库可用后）

```bash
# 1. 确认干净
git status

# 2. 打合并前标记
git tag v0.9-teacher-leader-merge-ready

# 3. 加远程并推送（等团队仓库就绪）
git remote add origin <repo-url>
git push -u origin main
git push origin v0.9-teacher-leader-merge-ready
```

PR 描述建议直接引用：

- 变更范围：教师端 8 页 + 组长端 11 页 + 12 个 store + 后端契约/阶段门禁；
- 验证方式：`npm run build`、`npm run smoke`（234 项）；
- 风险点：所有数据仍为 Mock、学院审核为演示台、日志为前端留痕；
- 后续替换点：见 `docs/INTEGRATION.md`。

---

## 7. 回滚

- 本地标签：`v0.9-teacher-leader-merge-ready`
- 完整仓库快照：`~/桌面/training-room-selection-<date>.bundle`
- 回退：`git reset --hard <tag>` 或 `git clone <bundle>`
