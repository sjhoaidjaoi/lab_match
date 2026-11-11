# 03 Database｜实验室负责人模块相关表

> 本文件从主项目 `docs-framework/03_Database.md` 提取负责人模块涉及的 15 张表，包含字段说明与建表 DDL。
> 字段名、类型、状态值与主项目数据库文档保持一致。

## 1. 表结构
### 3.1 sys_user 用户账号

| 字段 | 类型 | 允许空 | 默认值 | 说明 |
|---|---|---|---|---|
| id | BIGINT | N | 自增 | 主键 |
| user_no | VARCHAR(32) | N | | 学号 / 工号，全局唯一 |
| password | VARCHAR(100) | N | | BCrypt 密文 |
| real_name | VARCHAR(50) | N | | 姓名 |
| user_type | TINYINT | N | | 1 学生 2 教师 3 管理员 |
| gender | TINYINT | Y | 0 | 0 未知 1 男 2 女 |
| phone | VARCHAR(20) | Y | | 手机号 |
| email | VARCHAR(100) | Y | | 邮箱 |
| college | VARCHAR(100) | Y | | 学院 |
| major | VARCHAR(100) | Y | | 专业，仅学生 |
| grade | VARCHAR(20) | Y | | 年级，仅学生 |
| title | VARCHAR(50) | Y | | 职称，仅教师 |
| status | TINYINT | N | 1 | 1 启用 0 禁用 |
| need_change_pwd | TINYINT | N | 1 | 1 需改密 0 不需 |
| last_login_at | DATETIME | Y | | 最后登录时间 |
| gmt_create | DATETIME | N | CURRENT_TIMESTAMP | 创建时间 |
| gmt_modified | DATETIME | N | CURRENT_TIMESTAMP | 更新时间 |

索引：`uk_user_no(user_no)`、`idx_type_status(user_type, status)`


### 3.2 lab 实训室

| 字段 | 类型 | 允许空 | 默认值 | 说明 |
|---|---|---|---|---|
| id | BIGINT | N | 自增 | 主键 |
| lab_code | VARCHAR(32) | N | | 实训室编码，唯一 |
| lab_name | VARCHAR(100) | N | | 实训室名称 |
| introduction | TEXT | Y | | 简介 |
| research_direction | VARCHAR(500) | Y | | 研究方向 |
| equipment_env | TEXT | Y | | 设备与环境 |
| training_plan | TEXT | Y | | 培养安排 |
| assessment_requirement | TEXT | Y | | 考核要求 |
| open_day_date | DATE | Y | | 开放日日期 |
| open_day_start_time | TIME | Y | | 开放日开始时间 |
| open_day_end_time | TIME | Y | | 开放日结束时间 |
| open_day_location | VARCHAR(200) | Y | | 开放日地点 |
| open_day_note | VARCHAR(500) | Y | | 开放日注意事项 |
| total_quota | INT | N | 0 | 本室总名额 |
| leader_id | BIGINT | Y | | 负责人 sys_user.id（教师） |
| status | TINYINT | N | 1 | 1 开放 0 关闭 |
| gmt_create | DATETIME | N | CURRENT_TIMESTAMP | 创建时间 |
| gmt_modified | DATETIME | N | CURRENT_TIMESTAMP | 更新时间 |

索引：`uk_lab_code(lab_code)`、`idx_leader_id(leader_id)`、`idx_status(status)`


### 3.3 mentor_profile 导师档案

| 字段 | 类型 | 允许空 | 默认值 | 说明 |
|---|---|---|---|---|
| id | BIGINT | N | 自增 | 主键 |
| user_id | BIGINT | N | | 关联 sys_user.id，教师 |
| lab_id | BIGINT | N | | 所属实训室 |
| research_direction | VARCHAR(500) | Y | | 研究方向 |
| quota | INT | N | 0 | 个人招录名额上限（整个选拔周期） |
| quota_used | INT | N | 0 | 已占用名额（含拟录取占位与待确认） |
| version | INT | N | 0 | 乐观锁版本号 |
| status | TINYINT | N | 1 | 1 在职 0 停用 |
| gmt_create | DATETIME | N | CURRENT_TIMESTAMP | 创建时间 |
| gmt_modified | DATETIME | N | CURRENT_TIMESTAMP | 更新时间 |

索引：`uk_user_id(user_id)`、`idx_lab_id(lab_id)`

约束：`quota_used <= quota`，由条件更新保证。


### 3.4 selection_round 选拔轮次

| 字段 | 类型 | 允许空 | 默认值 | 说明 |
|---|---|---|---|---|
| id | BIGINT | N | 自增 | 主键 |
| round_no | TINYINT | N | | 轮次序号 1 / 2 / 3 |
| round_name | VARCHAR(50) | N | | 轮次名称 |
| status | TINYINT | N | 1 | 1 未开始 2 填报中 3 面试中 4 拟录取确认中 5 已完成 |
| apply_start | DATETIME | N | | 意向填报开始 |
| apply_end | DATETIME | N | | 意向填报结束 |
| interview_start | DATETIME | N | | 面试开始 |
| interview_end | DATETIME | N | | 面试结束 |
| nomination_start | DATETIME | N | | 导师勾选与负责人汇总开始 |
| nomination_submit_end | DATETIME | N | | 名单提交截止；到点系统统一批处理签发，之后不再接受提交 |
| confirm_start | DATETIME | N | | 学生确认开始；批处理完成后开启，早于此刻学生看不到待确认记录 |
| nomination_end | DATETIME | N | | 确认截止；到点未确认批量置逾期 |
| inner_adjust_start | DATETIME | Y | | 阶段 6 内部调剂开始；为空表示本轮不开放本室内部调剂 |
| inner_adjust_end | DATETIME | Y | | 阶段 6 内部调剂结束；必须与开始时间同时配置，且不得晚于 `adjust_start` |
| adjust_start | DATETIME | N | | 统筹调剂开始；教师抢录与管理员兜底仅在此后可用 |
| adjust_end | DATETIME | N | | 统筹调剂结束；之后进入公示准备 |
| weight_attitude | DECIMAL(5,2) | N | 25.00 | 学习态度权重（%） |
| weight_logic | DECIMAL(5,2) | N | 25.00 | 逻辑思维权重（%） |
| weight_programming | DECIMAL(5,2) | N | 25.00 | 编程基础权重（%） |
| weight_time | DECIMAL(5,2) | N | 25.00 | 时间投入权重（%） |
| locked | TINYINT | N | 0 | 批次锁定：1 已锁定，全系统只读；仅最后一轮可置 1 |
| gmt_create | DATETIME | N | CURRENT_TIMESTAMP | 创建时间 |
| gmt_modified | DATETIME | N | CURRENT_TIMESTAMP | 更新时间 |

索引：`uk_round_no(round_no)`、`idx_status(status)`

约束：四维权重合计必须为 100.00。


### 3.5 intention 意向主表

| 字段 | 类型 | 允许空 | 默认值 | 说明 |
|---|---|---|---|---|
| id | BIGINT | N | 自增 | 主键 |
| round_id | BIGINT | N | | 所属轮次 |
| student_id | BIGINT | N | | 学生 sys_user.id |
| accept_inner_adjust | TINYINT | N | 0 | 是否服从实训室内部调剂 1 是 0 否 |
| accept_cross_adjust | TINYINT | N | 0 | 是否服从全院跨实训室调剂 1 是 0 否 |
| pool_consent | TINYINT | N | 0 | 是否同意全院导师在调剂池查看完整档案 1 是 0 否 |
| status | TINYINT | N | 1 | 1 草稿 2 已提交 |
| submit_time | DATETIME | Y | | 提交时间 |
| gmt_create | DATETIME | N | CURRENT_TIMESTAMP | 创建时间 |
| gmt_modified | DATETIME | N | CURRENT_TIMESTAMP | 更新时间 |

索引：`uk_round_student(round_id, student_id)`、`idx_student_id(student_id)`

### 3.6 intention_item 意向明细

| 字段 | 类型 | 允许空 | 默认值 | 说明 |
|---|---|---|---|---|
| id | BIGINT | N | 自增 | 主键 |
| intention_id | BIGINT | N | | 关联 intention.id |
| mentor_id | BIGINT | N | | 导师 mentor_profile.id |
| lab_id | BIGINT | N | | 导师所属实训室（冗余，便于按室查询） |
| gmt_create | DATETIME | N | CURRENT_TIMESTAMP | 创建时间 |
| gmt_modified | DATETIME | N | CURRENT_TIMESTAMP | 更新时间 |

索引：`uk_intention_mentor(intention_id, mentor_id)`、`idx_mentor_id(mentor_id)`、`idx_lab_id(lab_id)`

约束：同一 intention 下最多 3 条，由服务端校验；**不设顺序字段**，体现平行志愿不分先后。


### 3.7 interview_session 面试场次

| 字段 | 类型 | 允许空 | 默认值 | 说明 |
|---|---|---|---|---|
| id | BIGINT | N | 自增 | 主键 |
| round_id | BIGINT | N | | 所属轮次 |
| lab_id | BIGINT | N | | 承办实训室 |
| session_name | VARCHAR(100) | N | | 场次名称 |
| interview_date | DATE | N | | 面试日期 |
| start_time | TIME | N | | 开始时间 |
| end_time | TIME | N | | 结束时间 |
| location | VARCHAR(200) | N | | 面试地点 |
| capacity | INT | N | 0 | 容量 |
| status | TINYINT | N | 1 | 1 草稿 2 已发布 3 已结束 |
| gmt_create | DATETIME | N | CURRENT_TIMESTAMP | 创建时间 |
| gmt_modified | DATETIME | N | CURRENT_TIMESTAMP | 更新时间 |

索引：`idx_round_lab(round_id, lab_id)`、`idx_interview_date(interview_date)`

### 3.7.1 interview_session_interviewer 面试场次面试官

| 字段 | 类型 | 允许空 | 默认值 | 说明 |
|---|---|---|---|---|
| id | BIGINT | N | 自增 | 主键 |
| session_id | BIGINT | N | | 关联 interview_session.id |
| interviewer_id | BIGINT | N | | 面试官，关联 sys_user.id，须为本室在职导师 |
| gmt_create | DATETIME | N | CURRENT_TIMESTAMP | 创建时间 |
| gmt_modified | DATETIME | N | CURRENT_TIMESTAMP | 更新时间 |

索引：`uk_session_interviewer(session_id, interviewer_id)`、`idx_interviewer_id(interviewer_id)`

说明：

- 一个场次至少配置 1 名面试官，数量由服务端校验，无上限。
- 面试官必须是 `mentor_profile.lab_id = interview_session.lab_id` 且 `sys_user.status = 1` 的教师，跨室或已禁用账号一律拒绝（400002）。
- 同一场次同一面试官只出现一次，由唯一键兜底。
- 面试官时段冲突以 `interviewer_id` 关联本表与 `interview_session` 的 `interview_date + start_time ~ end_time` 判定，不新增冗余时间字段。

### 3.8 interview_schedule 面试排期

| 字段 | 类型 | 允许空 | 默认值 | 说明 |
|---|---|---|---|---|
| id | BIGINT | N | 自增 | 主键 |
| round_id | BIGINT | N | | 所属轮次 |
| lab_id | BIGINT | N | | 实训室 |
| mentor_id | BIGINT | N | | 面试导师 `mentor_profile.id` |
| session_id | BIGINT | N | | 面试场次 |
| student_id | BIGINT | N | | 学生 |
| status | TINYINT | N | 1 | 1 待面试 2 已完成 3 缺席 |
| gmt_create | DATETIME | N | CURRENT_TIMESTAMP | 创建时间 |
| gmt_modified | DATETIME | N | CURRENT_TIMESTAMP | 更新时间 |

索引：`uk_round_mentor_student(round_id, mentor_id, student_id)`、`idx_session_id(session_id)`、`idx_student_id(student_id)`、`idx_mentor_id(mentor_id)`

说明：一个学生在一轮内、同一导师只排 1 场；选择 N 位导师则最多 N 条排期，且不得时间冲突。

### 3.9 interview_score 面试评分

| 字段 | 类型 | 允许空 | 默认值 | 说明 |
|---|---|---|---|---|
| id | BIGINT | N | 自增 | 主键 |
| round_id | BIGINT | N | | 所属轮次 |
| lab_id | BIGINT | N | | 实训室 |
| mentor_id | BIGINT | N | | 评分导师 `mentor_profile.id` |
| student_id | BIGINT | N | | 学生 |
| session_id | BIGINT | Y | | 关联面试场次 |
| attitude_score | DECIMAL(5,2) | N | 0.00 | 学习态度（0-100） |
| logic_score | DECIMAL(5,2) | N | 0.00 | 逻辑思维（0-100） |
| programming_score | DECIMAL(5,2) | N | 0.00 | 编程基础（0-100） |
| time_score | DECIMAL(5,2) | N | 0.00 | 时间投入（0-100） |
| system_total | DECIMAL(5,2) | N | 0.00 | 系统按权重计算的总分 |
| manual_total | DECIMAL(5,2) | Y | | 手动覆写总分，NULL 表示未覆写 |
| final_total | DECIMAL(5,2) | N | 0.00 | 实际使用总分 = manual_total 非空取之，否则取 system_total |
| adjust_reason | VARCHAR(500) | Y | | 手动调整理由 |
| comment | VARCHAR(1000) | Y | | 面试评语 |
| scorer_id | BIGINT | N | | 录分人（导师本人） |
| status | TINYINT | N | 1 | 1 草稿 2 已提交 |
| gmt_create | DATETIME | N | CURRENT_TIMESTAMP | 创建时间 |
| gmt_modified | DATETIME | N | CURRENT_TIMESTAMP | 更新时间 |

索引：`uk_round_mentor_student(round_id, mentor_id, student_id)`、`idx_round_lab(round_id, lab_id)`、`idx_scorer_id(scorer_id)`、`idx_mentor_id(mentor_id)`

说明：评分按“导师 + 学生”独立记录，各导师分数独立用于本人拟录取，不做平均。

### 3.10 nomination 拟录取

| 字段 | 类型 | 允许空 | 默认值 | 说明 |
|---|---|---|---|---|
| id | BIGINT | N | 自增 | 主键 |
| round_id | BIGINT | N | | 所属轮次 |
| lab_id | BIGINT | N | | 实训室 |
| mentor_id | BIGINT | N | | 导师 mentor_profile.id |
| student_id | BIGINT | N | | 学生 |
| score_id | BIGINT | N | | 关联 interview_score.id |
| total_score | DECIMAL(5,2) | N | 0.00 | 拟录取时的总分快照 |
| status | TINYINT | N | 1 | 1 草稿 2 已提交 3 已作废 |
| gmt_create | DATETIME | N | CURRENT_TIMESTAMP | 创建时间 |
| gmt_modified | DATETIME | N | CURRENT_TIMESTAMP | 更新时间 |

索引：`uk_round_mentor_student(round_id, mentor_id, student_id)`、`idx_round_student(round_id, student_id)`、`idx_mentor_id(mentor_id)`

约束：同一导师勾选人数 ≤ `mentor_profile.quota`，由名额条件更新保证。


### 3.12 admission 录取结果

| 字段 | 类型 | 允许空 | 默认值 | 说明 |
|---|---|---|---|---|
| id | BIGINT | N | 自增 | 主键 |
| round_id | BIGINT | N | | 所属轮次 |
| student_id | BIGINT | N | | 学生 |
| lab_id | BIGINT | N | | 实训室 |
| mentor_id | BIGINT | N | | 导师 |
| source_type | TINYINT | N | 1 | 1 拟录取 2 递补 3 内部调剂 4 跨室调剂 5 座谈安置 |
| pending_type | TINYINT | Y | | 待确认类型：1 拟录取多选一 2 递补待确认 3 异议调整待确认 4 内部调剂待确认；NULL 表示无需确认。**检索一律按 `status = 1`，该字段仅作展示标签** |
| active_flag | TINYINT | Y | | 终局有效标记：`status ∈ {2,3}` 时为 1，`{1,4,5}` 时为 NULL。**待确认期（status=1）必须为 NULL**，否则同轮多条待确认会撞唯一键 |
| nomination_id | BIGINT | Y | | 来源拟录取记录 |
| waitlist_id | BIGINT | Y | | 来源递补记录 |
| reallocation_id | BIGINT | Y | | 来源调剂记录 |
| total_score | DECIMAL(5,2) | Y | | 录取时总分快照 |
| status | TINYINT | N | 1 | 1 待确认 2 已确认 3 已入组 4 已放弃 5 逾期未确认 |
| confirm_deadline | DATETIME | Y | | 确认截止时间 |
| confirm_time | DATETIME | Y | | 确认时间 |
| gmt_create | DATETIME | N | CURRENT_TIMESTAMP | 创建时间 |
| gmt_modified | DATETIME | N | CURRENT_TIMESTAMP | 更新时间 |

索引：`uk_round_mentor_student(round_id, mentor_id, student_id)`、`uk_round_student_active(round_id, student_id, active_flag)`、`idx_student_id(student_id)`、`idx_round_lab(round_id, lab_id)`、`idx_lab_id(lab_id)`、`idx_status(status)`

约束：同一轮次同一导师对同一学生只有一条记录；`uk_round_student_active` 只约束**终局态**（`active_flag = 1`），待确认期（`status = 1`）全部为 NULL，同轮可并存多条待确认供学生选择。状态变更必须同步维护 `active_flag`：进入 2/3 置 1，进入 1/4/5 置 NULL。


### 3.13 reallocation 调剂记录

| 字段 | 类型 | 允许空 | 默认值 | 说明 |
|---|---|---|---|---|
| id | BIGINT | N | 自增 | 主键 |
| round_id | BIGINT | N | | 所属轮次 |
| student_id | BIGINT | N | | 学生 |
| from_lab_id | BIGINT | Y | | 原实训室（座谈安置可为空） |
| to_lab_id | BIGINT | N | | 调剂目标实训室 |
| to_mentor_id | BIGINT | N | | 调剂目标导师 |
| level | TINYINT | N | | 1 内部调剂 2 跨室调剂 3 座谈安置 |
| operator_id | BIGINT | N | | 操作人用户ID（导师 / 负责人 / 管理员） |
| reason | VARCHAR(500) | Y | | 调剂说明 |
| gmt_create | DATETIME | N | CURRENT_TIMESTAMP | 创建时间 |
| gmt_modified | DATETIME | N | CURRENT_TIMESTAMP | 更新时间 |

索引：`idx_round_id(round_id)`、`idx_student_id(student_id)`、`idx_to_mentor_id(to_mentor_id)`


### 3.17 user_notice 站内通知

| 字段 | 类型 | 允许空 | 默认值 | 说明 |
|---|---|---|---|---|
| id | BIGINT | N | 自增 | 主键 |
| user_id | BIGINT | N | | 接收人 |
| title | VARCHAR(200) | N | | 标题 |
| content | VARCHAR(1000) | N | | 正文 |
| notice_type | TINYINT | N | | 1 系统 2 填报 3 面试 4 确认 5 公示 6 异议 |
| biz_type | VARCHAR(50) | Y | | 业务类型标识 |
| biz_id | BIGINT | Y | | 业务主键 |
| is_read | TINYINT | N | 0 | 0 未读 1 已读 |
| read_time | DATETIME | Y | | 阅读时间 |
| gmt_create | DATETIME | N | CURRENT_TIMESTAMP | 创建时间 |
| gmt_modified | DATETIME | N | CURRENT_TIMESTAMP | 更新时间 |

索引：`idx_user_read(user_id, is_read)`、`idx_gmt_create(gmt_create)`、`uk_biz_user_type(biz_type, biz_id, user_id, notice_type)`

说明：`uk_biz_user_type` 保证同一业务事件对同一用户同一类型只通知一次；提醒类通知使用 `biz_type = 'REMIND'`、`biz_id` 为提醒批次号（`yyyyMMdd`），实现 24 小时内只提醒一次。`biz_type` / `biz_id` 为 NULL 的纯系统通知不受唯一键约束（MySQL 唯一索引允许多个 NULL）。


### 3.18 operation_log 操作日志

| 字段 | 类型 | 允许空 | 默认值 | 说明 |
|---|---|---|---|---|
| id | BIGINT | N | 自增 | 主键 |
| operator_id | BIGINT | N | | 操作人 |
| operator_name | VARCHAR(50) | N | | 操作人姓名快照 |
| biz_type | VARCHAR(50) | N | | 业务类型：QUOTA / WAITLIST / REALLOCATION / ADMISSION 等 |
| biz_id | BIGINT | Y | | 业务主键 |
| action | VARCHAR(100) | N | | 动作描述 |
| before_value | TEXT | Y | | 变更前值 |
| after_value | TEXT | Y | | 变更后值 |
| reason | VARCHAR(500) | Y | | 操作理由 |
| ip | VARCHAR(50) | Y | | 客户端 IP |
| gmt_create | DATETIME | N | CURRENT_TIMESTAMP | 创建时间 |
| gmt_modified | DATETIME | N | CURRENT_TIMESTAMP | 更新时间 |

索引：`idx_biz(biz_type, biz_id)`、`idx_operator_id(operator_id)`、`idx_gmt_create(gmt_create)`

## 2. 建表 DDL

```sql
CREATE TABLE `sys_user` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_no` VARCHAR(32) NOT NULL COMMENT '学号/工号，全局唯一',
  `password` VARCHAR(100) NOT NULL COMMENT 'BCrypt 密码密文',
  `real_name` VARCHAR(50) NOT NULL COMMENT '姓名',
  `user_type` TINYINT NOT NULL COMMENT '用户类型：1学生 2教师 3管理员',
  `gender` TINYINT DEFAULT 0 COMMENT '性别：0未知 1男 2女',
  `phone` VARCHAR(20) DEFAULT NULL COMMENT '手机号',
  `email` VARCHAR(100) DEFAULT NULL COMMENT '邮箱',
  `college` VARCHAR(100) DEFAULT NULL COMMENT '学院',
  `major` VARCHAR(100) DEFAULT NULL COMMENT '专业，仅学生',
  `grade` VARCHAR(20) DEFAULT NULL COMMENT '年级，仅学生',
  `title` VARCHAR(50) DEFAULT NULL COMMENT '职称，仅教师',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '账号状态：1启用 0禁用',
  `need_change_pwd` TINYINT NOT NULL DEFAULT 1 COMMENT '是否需强制改密：1是 0否',
  `last_login_at` DATETIME DEFAULT NULL COMMENT '最后登录时间',
  `gmt_create` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `gmt_modified` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_no` (`user_no`),
  KEY `idx_type_status` (`user_type`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户账号表';

CREATE TABLE `lab` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `lab_code` VARCHAR(32) NOT NULL COMMENT '实训室编码',
  `lab_name` VARCHAR(100) NOT NULL COMMENT '实训室名称',
  `introduction` TEXT COMMENT '实训室简介',
  `research_direction` VARCHAR(500) DEFAULT NULL COMMENT '研究方向',
  `equipment_env` TEXT COMMENT '设备与环境',
  `training_plan` TEXT COMMENT '培养安排',
  `assessment_requirement` TEXT COMMENT '考核要求',
  `open_day_date` DATE DEFAULT NULL COMMENT '开放日日期',
  `open_day_start_time` TIME DEFAULT NULL COMMENT '开放日开始时间',
  `open_day_end_time` TIME DEFAULT NULL COMMENT '开放日结束时间',
  `open_day_location` VARCHAR(200) DEFAULT NULL COMMENT '开放日地点',
  `open_day_note` VARCHAR(500) DEFAULT NULL COMMENT '开放日注意事项',
  `total_quota` INT NOT NULL DEFAULT 0 COMMENT '本室总名额',
  `leader_id` BIGINT DEFAULT NULL COMMENT '负责人用户ID',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1开放 0关闭',
  `gmt_create` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `gmt_modified` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_lab_code` (`lab_code`),
  KEY `idx_leader_id` (`leader_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='实训室表';

CREATE TABLE `mentor_profile` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_id` BIGINT NOT NULL COMMENT '用户ID（教师）',
  `lab_id` BIGINT NOT NULL COMMENT '所属实训室ID',
  `research_direction` VARCHAR(500) DEFAULT NULL COMMENT '研究方向',
  `quota` INT NOT NULL DEFAULT 0 COMMENT '个人招录名额上限',
  `quota_used` INT NOT NULL DEFAULT 0 COMMENT '已占用名额（含拟录取占位与待确认）',
  `version` INT NOT NULL DEFAULT 0 COMMENT '乐观锁版本号',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1在职 0停用',
  `gmt_create` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `gmt_modified` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_id` (`user_id`),
  KEY `idx_lab_id` (`lab_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='导师档案表';

CREATE TABLE `selection_round` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `round_no` TINYINT NOT NULL COMMENT '轮次序号：1/2/3',
  `round_name` VARCHAR(50) NOT NULL COMMENT '轮次名称',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1未开始 2填报中 3面试中 4拟录取确认中 5已完成',
  `apply_start` DATETIME NOT NULL COMMENT '填报开始时间',
  `apply_end` DATETIME NOT NULL COMMENT '填报结束时间',
  `interview_start` DATETIME NOT NULL COMMENT '面试开始时间',
  `interview_end` DATETIME NOT NULL COMMENT '面试结束时间',
  `nomination_start` DATETIME NOT NULL COMMENT '导师勾选与负责人汇总开始时间',
  `nomination_submit_end` DATETIME NOT NULL COMMENT '名单提交截止时间，到点系统统一批处理签发',
  `confirm_start` DATETIME NOT NULL COMMENT '学生确认开始时间，早于此刻不可见待确认记录',
  `nomination_end` DATETIME NOT NULL COMMENT '确认截止时间，到点未确认批量置逾期',
  `inner_adjust_start` DATETIME DEFAULT NULL COMMENT '阶段6内部调剂开始时间，为空表示不开放',
  `inner_adjust_end` DATETIME DEFAULT NULL COMMENT '阶段6内部调剂结束时间，不得晚于跨室调剂开始',
  `adjust_start` DATETIME NOT NULL COMMENT '统筹调剂开始时间，抢录与兜底仅此后可用',
  `adjust_end` DATETIME NOT NULL COMMENT '统筹调剂结束时间',
  `weight_attitude` DECIMAL(5,2) NOT NULL DEFAULT 25.00 COMMENT '学习态度权重(%)',
  `weight_logic` DECIMAL(5,2) NOT NULL DEFAULT 25.00 COMMENT '逻辑思维权重(%)',
  `weight_programming` DECIMAL(5,2) NOT NULL DEFAULT 25.00 COMMENT '编程基础权重(%)',
  `weight_time` DECIMAL(5,2) NOT NULL DEFAULT 25.00 COMMENT '时间投入权重(%)',
  `locked` TINYINT NOT NULL DEFAULT 0 COMMENT '批次锁定：1已锁定 0未锁定',
  `gmt_create` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `gmt_modified` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_round_no` (`round_no`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='选拔轮次表';

CREATE TABLE `intention` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `round_id` BIGINT NOT NULL COMMENT '轮次ID',
  `student_id` BIGINT NOT NULL COMMENT '学生用户ID',
  `accept_inner_adjust` TINYINT NOT NULL DEFAULT 0 COMMENT '服从实训室内部调剂：1是 0否',
  `accept_cross_adjust` TINYINT NOT NULL DEFAULT 0 COMMENT '服从全院跨实训室调剂：1是 0否',
  `pool_consent` TINYINT NOT NULL DEFAULT 0 COMMENT '同意全院导师在调剂池查看完整档案：1是 0否',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1草稿 2已提交',
  `submit_time` DATETIME DEFAULT NULL COMMENT '提交时间',
  `gmt_create` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `gmt_modified` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_round_student` (`round_id`, `student_id`),
  KEY `idx_student_id` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='意向主表';

CREATE TABLE `intention_item` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `intention_id` BIGINT NOT NULL COMMENT '意向主表ID',
  `mentor_id` BIGINT NOT NULL COMMENT '导师档案ID',
  `lab_id` BIGINT NOT NULL COMMENT '导师所属实训室ID',
  `gmt_create` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `gmt_modified` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_intention_mentor` (`intention_id`, `mentor_id`),
  KEY `idx_mentor_id` (`mentor_id`),
  KEY `idx_lab_id` (`lab_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='意向明细表（平行志愿，不分先后）';

CREATE TABLE `interview_session` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `round_id` BIGINT NOT NULL COMMENT '轮次ID',
  `lab_id` BIGINT NOT NULL COMMENT '实训室ID',
  `session_name` VARCHAR(100) NOT NULL COMMENT '场次名称',
  `interview_date` DATE NOT NULL COMMENT '面试日期',
  `start_time` TIME NOT NULL COMMENT '开始时间',
  `end_time` TIME NOT NULL COMMENT '结束时间',
  `location` VARCHAR(200) NOT NULL COMMENT '面试地点',
  `capacity` INT NOT NULL DEFAULT 0 COMMENT '容量',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1草稿 2已发布 3已结束',
  `gmt_create` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `gmt_modified` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_round_lab` (`round_id`, `lab_id`),
  KEY `idx_interview_date` (`interview_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='面试场次表';

CREATE TABLE `interview_session_interviewer` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `session_id` BIGINT NOT NULL COMMENT '面试场次ID',
  `interviewer_id` BIGINT NOT NULL COMMENT '面试官用户ID（须为本室在职导师）',
  `gmt_create` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `gmt_modified` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_session_interviewer` (`session_id`, `interviewer_id`),
  KEY `idx_interviewer_id` (`interviewer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='面试场次面试官关联表';

CREATE TABLE `interview_schedule` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `round_id` BIGINT NOT NULL COMMENT '轮次ID',
  `lab_id` BIGINT NOT NULL COMMENT '实训室ID',
  `mentor_id` BIGINT NOT NULL COMMENT '面试导师 mentor_profile.id',
  `session_id` BIGINT NOT NULL COMMENT '面试场次ID',
  `student_id` BIGINT NOT NULL COMMENT '学生用户ID',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1待面试 2已完成 3缺席',
  `gmt_create` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `gmt_modified` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_round_mentor_student` (`round_id`, `mentor_id`, `student_id`),
  KEY `idx_session_id` (`session_id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_mentor_id` (`mentor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='面试排期表（按导师分别面试）';

CREATE TABLE `interview_score` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `round_id` BIGINT NOT NULL COMMENT '轮次ID',
  `lab_id` BIGINT NOT NULL COMMENT '实训室ID',
  `mentor_id` BIGINT NOT NULL COMMENT '评分导师 mentor_profile.id',
  `student_id` BIGINT NOT NULL COMMENT '学生用户ID',
  `session_id` BIGINT DEFAULT NULL COMMENT '面试场次ID',
  `attitude_score` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT '学习态度得分(0-100)',
  `logic_score` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT '逻辑思维得分(0-100)',
  `programming_score` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT '编程基础得分(0-100)',
  `time_score` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT '时间投入得分(0-100)',
  `system_total` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT '系统计算总分',
  `manual_total` DECIMAL(5,2) DEFAULT NULL COMMENT '手动覆写总分，NULL表示未覆写',
  `final_total` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT '实际使用总分',
  `adjust_reason` VARCHAR(500) DEFAULT NULL COMMENT '手动调整理由',
  `comment` VARCHAR(1000) DEFAULT NULL COMMENT '面试评语',
  `scorer_id` BIGINT NOT NULL COMMENT '录分人（导师本人）',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1草稿 2已提交',
  `gmt_create` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `gmt_modified` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_round_mentor_student` (`round_id`, `mentor_id`, `student_id`),
  KEY `idx_round_lab` (`round_id`, `lab_id`),
  KEY `idx_scorer_id` (`scorer_id`),
  KEY `idx_mentor_id` (`mentor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='面试评分表（导师独立评分）';

CREATE TABLE `nomination` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `round_id` BIGINT NOT NULL COMMENT '轮次ID',
  `lab_id` BIGINT NOT NULL COMMENT '实训室ID',
  `mentor_id` BIGINT NOT NULL COMMENT '导师档案ID',
  `student_id` BIGINT NOT NULL COMMENT '学生用户ID',
  `score_id` BIGINT NOT NULL COMMENT '面试评分ID',
  `total_score` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT '拟录取时总分快照',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1草稿 2已提交 3已作废',
  `gmt_create` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `gmt_modified` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_round_mentor_student` (`round_id`, `mentor_id`, `student_id`),
  KEY `idx_round_student` (`round_id`, `student_id`),
  KEY `idx_mentor_id` (`mentor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='拟录取表';

CREATE TABLE `admission` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `round_id` BIGINT NOT NULL COMMENT '轮次ID',
  `student_id` BIGINT NOT NULL COMMENT '学生用户ID',
  `lab_id` BIGINT NOT NULL COMMENT '实训室ID',
  `mentor_id` BIGINT NOT NULL COMMENT '导师档案ID',
  `source_type` TINYINT NOT NULL DEFAULT 1 COMMENT '来源：1拟录取 2递补 3内部调剂 4跨室调剂 5座谈安置',
  `pending_type` TINYINT DEFAULT NULL COMMENT '待确认类型：1拟录取多选一 2递补待确认 3异议调整待确认 4内部调剂待确认',
  `active_flag` TINYINT DEFAULT NULL COMMENT '终局有效标记：status为2/3时为1，其余为NULL',
  `nomination_id` BIGINT DEFAULT NULL COMMENT '来源拟录取ID',
  `waitlist_id` BIGINT DEFAULT NULL COMMENT '来源递补ID',
  `reallocation_id` BIGINT DEFAULT NULL COMMENT '来源调剂ID',
  `total_score` DECIMAL(5,2) DEFAULT NULL COMMENT '录取时总分快照',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1待确认 2已确认 3已入组 4已放弃 5逾期未确认',
  `confirm_deadline` DATETIME DEFAULT NULL COMMENT '确认截止时间',
  `confirm_time` DATETIME DEFAULT NULL COMMENT '确认时间',
  `gmt_create` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `gmt_modified` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_round_mentor_student` (`round_id`, `mentor_id`, `student_id`),
  UNIQUE KEY `uk_round_student_active` (`round_id`, `student_id`, `active_flag`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_round_lab` (`round_id`, `lab_id`),
  KEY `idx_lab_id` (`lab_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='录取结果表';

CREATE TABLE `reallocation` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `round_id` BIGINT NOT NULL COMMENT '轮次ID',
  `student_id` BIGINT NOT NULL COMMENT '学生用户ID',
  `from_lab_id` BIGINT DEFAULT NULL COMMENT '原实训室ID',
  `to_lab_id` BIGINT NOT NULL COMMENT '调剂目标实训室ID',
  `to_mentor_id` BIGINT NOT NULL COMMENT '调剂目标导师ID',
  `level` TINYINT NOT NULL COMMENT '调剂级别：1内部调剂 2跨室调剂 3座谈安置',
  `operator_id` BIGINT NOT NULL COMMENT '操作人用户ID（导师/负责人/管理员）',
  `reason` VARCHAR(500) DEFAULT NULL COMMENT '调剂说明',
  `gmt_create` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `gmt_modified` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_round_id` (`round_id`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_to_mentor_id` (`to_mentor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='调剂记录表';

CREATE TABLE `user_notice` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_id` BIGINT NOT NULL COMMENT '接收人用户ID',
  `title` VARCHAR(200) NOT NULL COMMENT '标题',
  `content` VARCHAR(1000) NOT NULL COMMENT '正文',
  `notice_type` TINYINT NOT NULL COMMENT '类型：1系统 2填报 3面试 4确认 5公示 6异议',
  `biz_type` VARCHAR(50) DEFAULT NULL COMMENT '业务类型标识',
  `biz_id` BIGINT DEFAULT NULL COMMENT '业务主键',
  `is_read` TINYINT NOT NULL DEFAULT 0 COMMENT '是否已读：0未读 1已读',
  `read_time` DATETIME DEFAULT NULL COMMENT '阅读时间',
  `gmt_create` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `gmt_modified` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_read` (`user_id`, `is_read`),
  KEY `idx_gmt_create` (`gmt_create`),
  UNIQUE KEY `uk_biz_user_type` (`biz_type`, `biz_id`, `user_id`, `notice_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='站内通知表';

CREATE TABLE `operation_log` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `operator_id` BIGINT NOT NULL COMMENT '操作人用户ID',
  `operator_name` VARCHAR(50) NOT NULL COMMENT '操作人姓名快照',
  `biz_type` VARCHAR(50) NOT NULL COMMENT '业务类型：QUOTA/WAITLIST/REALLOCATION/ADMISSION等',
  `biz_id` BIGINT DEFAULT NULL COMMENT '业务主键',
  `action` VARCHAR(100) NOT NULL COMMENT '动作描述',
  `before_value` TEXT COMMENT '变更前值',
  `after_value` TEXT COMMENT '变更后值',
  `reason` VARCHAR(500) DEFAULT NULL COMMENT '操作理由',
  `ip` VARCHAR(50) DEFAULT NULL COMMENT '客户端IP',
  `gmt_create` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `gmt_modified` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_biz` (`biz_type`, `biz_id`),
  KEY `idx_operator_id` (`operator_id`),
  KEY `idx_gmt_create` (`gmt_create`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作日志表';
```