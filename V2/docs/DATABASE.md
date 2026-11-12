# 数据库说明 V0.1

结构文件：`database/schema.sql`，演示数据：`database/seed.sql`。

## 表与职责

| 表 | 职责 | 关键约束 |
|---|---|---|
| users | 四种角色统一账号 | username 唯一 |
| laboratories | 实训室与名额 | leader_id → users |
| recruitment_batches | 每届一个选拔批次 | — |
| recruitment_stages | 八阶段起止与状态 | (batch, stage, round) 唯一 |
| student_preferences | 学生志愿 | (batch, student, lab, round) 唯一，每轮 ≤3 条 |
| student_batch_wishes | 两个调剂意愿 | (batch, student) 唯一 |
| interviews | 面试与五维评分 | (batch, student, lab, interviewer, round) 唯一 |
| admission_intentions | 拟录取 / 递补 | (batch, student, lab, type) 唯一；alternate 有 order_no |
| adjustments | 内部 / 跨室 / 安置 | reason 必填；priority_level 1/2/3 |
| final_admissions | 最终名单 | (batch, student) 唯一 |
| operation_logs | 操作留痕 | 名单、调剂、阶段、权限操作必写 |

## 相对需求文档的两处建模调整（已标注待确认）

1. **`student_preferences` / `interviews` 增加 `round_no`**：流程图第 6 步是「公布余额 → 重新填报 → 再面试」，与文档「内部调剂不再面试」不同口径。加轮次字段后两种模式都能落地，且不会撞「每人最多 3 条」的唯一约束。
2. **调剂意愿拆出 `student_batch_wishes`**：意愿是「学生 × 批次」属性，挂在每条志愿上会出现同一学生三条记录不一致。

## 名额与空缺口径

```text
空缺名额 = laboratories.recruitment_quota - COUNT(admission_intentions WHERE status='CONFIRMED' AND type='INTENDED')
```

- 超时未确认由后端定时任务将 status 置为 `ABANDONED`，再按 alternates.order_no 顺位补录；
- 学院临时调整名额时，前端必须重新拉取，不得使用缓存快照。


## 预留表（schema_reserved.sql）

以下表默认不执行，功能上线时并入 `schema.sql`：

| 表 | 用途 |
|---|---|
| `user_laboratories` | 教师/组长 ↔ 实训室多对多授权（一人一室的真实来源） |
| `files` | 简历、成绩单、宣讲视频、全景资源 |
| `notifications` | 站内通知（含受众） |
| `announcements` | 学院公告/宣讲通知 |
