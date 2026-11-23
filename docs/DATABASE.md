# 数据库设计说明

## 一、总体说明

系统提供两套等价的数据定义，并支持通过环境变量切换：

1. **文件数据层（默认）**：`backend/data/.store.json`，由 `backend/data/seed.js` 初始化与迁移，Node.js 进程直接读写。演示、自动化测试与无 MySQL 环境均使用该模式。
2. **MySQL 数据层**：`backend/data/mysql.js` 适配层。设置 `DB_DRIVER=mysql` 后，启动时从 MySQL 全量加载到内存 Store，每次写入在事务内同步回数据库；路由层代码完全复用。
3. **MySQL 设计**：`database/schema.sql`（基础表）+ `migration_v2.sql` + `migration_v3.sql`（新增表、字段、唯一约束、扩展字段兜底）。

切换方式：

```bash
# backend/.env
DB_DRIVER=mysql
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=******
MYSQL_DATABASE=lab_match
```

```bash
cd backend
npm run db:init    # 建库建表 + 执行增量迁移（可重复执行）
npm run db:check   # 检查连接与各表数据量
npm start          # /api/health 的 data.storage 应返回 mysql
```

MySQL 空库首次启动会自动写入种子数据；连接失败时进程直接退出并提示，避免带病运行。

## 二、运行期集合（.store.json）

| 集合 | 说明 | 关键字段 |
| --- | --- | --- |
| `users` | 用户 | `id, username, passwordHash, realName, studentNumber, role, phone, email, laboratoryId, status` |
| `laboratories` | 实训室 | `id, name, description, projectDirection, technologyStack, recruitmentQuota, leaderId, briefingText, briefingVideoUrl, status, vacancyReport` |
| `recruitmentBatches` | 选拔批次 | `id, batchName, academicYear, status, startDate, endDate` |
| `recruitmentStages` | 八阶段 | `id, batchId, stageNumber, stageName, stageStatus, startTime, endTime` |
| `studentPreferences` | 学生志愿 | `id, batchId, studentId, laboratoryId, obeyInternalAdjustment, obeyCollegeAdjustment, submittedAt, status` |
| `interviews` | 面试 | `id, batchId, studentId, laboratoryId, interviewerId, interviewTime, interviewStatus, 五维分数, evaluation, recommendation` |
| `admissionIntentions` | 拟录取/递补 | `id, batchId, studentId, laboratoryId, admissionType, status, confirmationDeadline, autoConfirmed, confirmedAt` |
| `adjustments` | 调剂 | `id, batchId, studentId, sourceLaboratoryId, targetLaboratoryId, adjustmentType, reason, operatorId, status` |
| `finalAdmissions` | 最终录取 | `id, batchId, studentId, laboratoryId, admissionSource, finalStatus, confirmedAt, enrolledAt` |
| `finalReview` | 最终名单审核 | `batchId, reviewerId, status, note, reviewedAt` |
| `publication` | 公示 | `id, title, content, startAt, endAt, status` |
| `publicationObjections` | 公示异议 | `id, studentId, type, content, status, handlerId, handlingNote` |
| `announcements` | 公告/宣讲 | `id, title, content, type, status, createdAt` |
| `openDaySchedules` | 开放日安排 | `id, laboratoryId, title, date, startTime, endTime, location, note` |
| `labTeachers` | 实训室导师团队 | `id, laboratoryId, userId, name, title, direction, intro, sortNo, status` |
| `mediaVideos` | 宣讲/介绍视频 | `id, laboratoryId, title, url, type, status` |
| `mediaPanoramas` | 全景资源 | `id, laboratoryId, title, url, thumbnail, status` |
| `notices` | 消息通知 | `id, title, content, targetUserId, targetRole, isRead, createdAt` |
| `operationLogs` | 操作日志 | `id, userId, username, operationType, targetType, targetId, description, createdAt` |

迁移：`getStore()` 每次加载后执行 `migrateStore()`，自动补齐新增集合（如 `openDaySchedules/publicationObjections/labTeachers`）和缺失字段，不覆盖已有业务数据。

并发与持久化：

- 所有非 GET 请求在 `app.js` 中进入串行队列，保证读改写不交错；
- 文件模式：`saveStore()` 先写 `.tmp` 再原子重命名，避免写一半损坏；
- MySQL 模式：每次 `persistStore()` 在事务内整表同步（upsert + 清理已删除行），失败整体回滚，写入按队列顺序异步落库；
- 支持 `LAB_STORE_FILE` 环境变量指定数据文件（自动化测试使用副本，不修改演示数据）。

## 三、MySQL 表结构

### 基础表（`database/schema.sql`）

| 表 | 说明 |
| --- | --- |
| `users` | 用户与角色（学生/教师/组长/学院负责人） |
| `laboratories` | 实训室、方向、技术栈、名额、负责人 |
| `recruitment_batches` | 选拔批次 |
| `recruitment_stages` | 八阶段及时间窗 |
| `student_preferences` | 学生志愿与两项调剂意愿 |
| `interviews` | 面试安排、五维评分、评价、建议 |
| `admission_intentions` | 拟录取与递补 |
| `adjustments` | 内部调剂、跨室调剂、沟通安置 |
| `final_admissions` | 最终录取名单与入组状态 |
| `operation_logs` | 操作日志 |
| `announcements` | 公告 |
| `media_videos` / `media_panoramas` | 媒体资源 |

### 本轮迁移（`database/migration_v2.sql`）

| 变更 | 目的 |
| --- | --- |
| `users.laboratory_id` + 索引 + 外键 | 教师/组长数据隔离，后端 `guardLab` 依据 |
| `interviews` 唯一键 `(batch_id, student_id, laboratory_id)` | 防止重复面试记录 |
| `admission_intentions` 唯一键 `(batch_id, student_id, laboratory_id)` | 防止重复拟录取 |
| 新表 `final_reviews` | 最终名单审核（阶段八） |
| 新表 `publication_objections` | 公示异议登记与处理（阶段八） |
| 新表 `open_day_schedules` | 开放日安排（阶段二） |
| `laboratories` 新增 `briefing_text/briefing_video_url/training_plan/basic_requirement/assessment_method` | 阶段一宣讲字段 |

### 第二轮迁移（`database/migration_v3.sql`）

| 变更 | 目的 |
| --- | --- |
| `users.email` | 个人信息维护 |
| 新表 `lab_teachers` | 实训室导师团队（一个实训室多名导师） |
| `laboratories.briefing_video_type` | 宣讲视频类型（MP4/LINK/EMBED） |
| `laboratories.vacancy_report JSON` | 组长上报剩余名额 |
| `open_day_schedules` 批次可空 + `date/title/note` | 与开放日页面字段对齐 |
| `publication_objections.status` 增加 `ACCEPTED` | 与异议处理状态一致 |
| 全部业务表增加 `extra_json` | 保存尚未建列的扩展字段，MySQL 模式不丢数据 |

执行顺序：

```sql
SOURCE database/schema.sql;
SOURCE database/migration_v2.sql;
SOURCE database/migration_v3.sql;
```

或直接执行：

```bash
cd backend && npm run db:init
```

`db:init` 会先用 `information_schema` 判断现场属于哪一种，再决定动作：

1. **数据库不存在** → 建库 + 完整 `schema.sql`；
2. **库存在但本系统表 0 张**（例如空库上线）→ 完整 `schema.sql`；
3. **库存在且已有本系统表** → 只执行 v2 → v14 增量迁移，绝不执行含 `DROP TABLE` 的完整脚本。

迁移按分号逐条执行（字符串/注释内的分号会被正确跳过），失败时抛出「文件 + 第几条 + SQL 片段 + MySQL 错误码」，
只忽略 `ER_DUP_FIELDNAME / ER_DUP_KEYNAME / ER_FK_DUP_NAME / ER_TABLE_EXISTS_ERROR` 这类「对象已存在」错误，
`ER_DUP_ENTRY`（1062）等数据错误不会被吞掉。结束后校验 37 张业务表是否齐全，缺表即视为失败。

权限只要求目标库范围内：`CREATE, ALTER, INDEX, REFERENCES, SELECT, INSERT, UPDATE, DELETE, DROP`，
不需要全局权限或 `SUPER`。

### MySQL 运行模式说明

- 启动时读取 `information_schema.COLUMNS` 建立 `snake_case ↔ camelCase` 映射，新增字段无需修改加载代码；
- 未建列的字段自动写入 `extra_json`，读取时自动合并回记录；
- 写入在单个连接事务内完成，失败整体回滚；`FOREIGN_KEY_CHECKS` 在事务内临时关闭以保证整表同步顺序；
- 当前为“内存 Cache + 全量同步”，适合学院级数据量；多实例部署时需共享同一 MySQL，或后续改造为增量写入。

## 四、关联关系

```
users 1 ── n student_preferences n ── 1 laboratories
users 1 ── n interviews n ── 1 laboratories
users 1 ── n admission_intentions n ── 1 laboratories
recruitment_batches 1 ── n recruitment_stages
recruitment_batches 1 ── n student_preferences / interviews / admission_intentions / adjustments / final_admissions
adjustments.source_laboratory_id / target_laboratory_id → laboratories
final_admissions.student_id → users, laboratory_id → laboratories
publication_objections.student_id → users, handler_id → users
```

## 五、关键业务约束

| 约束 | 实现位置 |
| --- | --- |
| 一个批次内每生最多 3 个不同实训室志愿 | `preferences.js`（zod + 去重） |
| 面试/拟录取按批次+学生+实训室唯一 | 业务层去重 + MySQL 唯一索引 |
| 拟录取人数不得超过名额 | `admissions.js` `occupiedCount()` |
| 最终录取不得超额/重复 | `final.js` 合并前校验 + `/final/check` |
| 已确认录取/已入组学生不得再进调剂池 | `adjustments.js` `validateAdjustment()` |
| 内部调剂限本室、跨室调剂需服从全院调剂 | `adjustments.js` + `guardLab` |
| 公示须审核通过后发布 | `final.js` `/publicity` |
| 重复入组被拒绝 | `final.js` `/:id/enroll`、`/enroll-all` |
| 写操作串行化、原子落盘 | `app.js` 队列 + `seed.js` `saveStore()` / `mysql.js` 事务 |

## 六、待确认与已知限制

- MySQL 适配层的初始化（建库 / 建表 / v2–v14 迁移 / 幂等重跑 / 数据保留）已在 MySQL 8.0.46 上用独立测试库实测通过（`npm run test:db`）；
  但「浏览器 → 后端 → MySQL 全链路业务回归」仍在 JS 文件数据源上执行，MySQL 模式只验证了启动加载与健康检查。
- MySQL 模式采用整表同步，数据量很大时应改为增量写入或直接 SQL 查询。
- 面试地点、形式、确认时限、递补排序、自动匹配权重等字段口径需学院确认后补充。
