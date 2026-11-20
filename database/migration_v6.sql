-- ============================================================
-- migration_v6：批次停止 + 账号软删除 + 日志前后值快照
-- 说明：全部为非破坏性变更。项目自带的 npm run db:init 会忽略重复列/索引错误，
--       因此可重复执行；手工执行如需重复运行请加 --force：
--       mysql --force -u root -p lab_match < database/migration_v6.sql
-- ============================================================

-- ---------- 1. 批次状态：新增 STOPPED（已停止，终止本次选拔且默认不可恢复） ----------
ALTER TABLE recruitment_batches
  MODIFY COLUMN status ENUM('DRAFT','IN_PROGRESS','COMPLETED','CANCELLED','STOPPED')
  NOT NULL DEFAULT 'IN_PROGRESS'
  COMMENT 'DRAFT 草稿 / IN_PROGRESS 进行中 / COMPLETED 已结束 / CANCELLED 已取消 / STOPPED 已停止';

ALTER TABLE recruitment_batches
  ADD COLUMN stopped_at DATETIME NULL COMMENT '停止时间',
  ADD COLUMN stopped_by BIGINT UNSIGNED NULL COMMENT '停止操作人',
  ADD COLUMN stop_reason VARCHAR(200) NULL COMMENT '停止原因',
  ADD COLUMN reopened_at DATETIME NULL COMMENT '恢复时间',
  ADD COLUMN reopened_by BIGINT UNSIGNED NULL COMMENT '恢复操作人',
  ADD COLUMN reopen_reason VARCHAR(200) NULL COMMENT '恢复原因';

-- ---------- 2. 阶段状态：仅作快照，有效状态由 start_time/end_time 实时推导 ----------
ALTER TABLE recruitment_stages
  MODIFY COLUMN stage_status ENUM('NOT_STARTED','IN_PROGRESS','COMPLETED','PAUSED')
  NOT NULL DEFAULT 'NOT_STARTED'
  COMMENT '状态快照：由起止时间推导，PAUSED 表示人工暂停（优先于时间窗）';

-- 人工干预标记：PAUSED 暂停 / COMPLETED 提前结束；为空表示按时间窗自动流转
ALTER TABLE recruitment_stages
  ADD COLUMN status_override ENUM('PAUSED','COMPLETED') NULL
  COMMENT '人工干预状态，非空时优先于时间窗推导，需显式恢复自动流转';

-- ---------- 3. 账号：软删除与凭证版本 ----------
ALTER TABLE users
  ADD COLUMN deleted_at DATETIME NULL COMMENT '软删除时间，非空表示已停用或删除',
  ADD COLUMN credential_version INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '凭证版本，改密/停用后自增使旧会话失效';

ALTER TABLE users
  ADD INDEX idx_lab_role_status (role, status);

-- ---------- 4. 操作日志：关键操作的前后值快照 ----------
ALTER TABLE operation_logs
  ADD COLUMN detail JSON NULL COMMENT '关键操作的前后值快照';

-- 迁移完成
