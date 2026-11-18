-- =====================================================================
-- v13：多轮补录 + 全院调剂池
-- 1. 新增 recruitment_rounds：批次内的轮次（1 主线 / 2、3 补录）
-- 2. 志愿、面试、拟录取、调剂、最终名单五张表补 `round` 列（历史数据默认 1）
-- =====================================================================

CREATE TABLE IF NOT EXISTS recruitment_rounds (
  id BIGINT UNSIGNED PRIMARY KEY,
  batch_id BIGINT UNSIGNED NOT NULL,
  `round` INT UNSIGNED NOT NULL,
  label VARCHAR(32) NOT NULL,
  status ENUM('OPEN','CLOSED') NOT NULL DEFAULT 'CLOSED',
  opened_at DATETIME NULL,
  closed_at DATETIME NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uk_round_batch_round (batch_id, `round`),
  KEY idx_round_batch_status (batch_id, status),
  CONSTRAINT fk_round_batch FOREIGN KEY (batch_id) REFERENCES recruitment_batches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE student_preferences ADD COLUMN `round` INT UNSIGNED NOT NULL DEFAULT 1;
ALTER TABLE interviews ADD COLUMN `round` INT UNSIGNED NOT NULL DEFAULT 1;
ALTER TABLE admission_intentions ADD COLUMN `round` INT UNSIGNED NOT NULL DEFAULT 1;
ALTER TABLE adjustments ADD COLUMN `round` INT UNSIGNED NOT NULL DEFAULT 1;
ALTER TABLE final_admissions ADD COLUMN `round` INT UNSIGNED NOT NULL DEFAULT 1;

UPDATE student_preferences SET `round` = 1 WHERE `round` IS NULL;
UPDATE interviews SET `round` = 1 WHERE `round` IS NULL;
UPDATE admission_intentions SET `round` = 1 WHERE `round` IS NULL;
UPDATE adjustments SET `round` = 1 WHERE `round` IS NULL;
UPDATE final_admissions SET `round` = 1 WHERE `round` IS NULL;

-- 面试唯一键需带上轮次：同一学生同一实训室在不同补录轮可各面一次
-- 注意顺序：必须先建新唯一索引（首列 batch_id 同时是 fk_interview_batch 的支撑索引），
-- 再删旧索引 uk_interview_attempt，否则 InnoDB 会因外键约束拒绝删除旧索引。
SET @round_attempt_key = (SELECT COUNT(*) FROM information_schema.STATISTICS
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'interviews' AND INDEX_NAME = 'uk_interview_round_attempt');
SET @create_attempt_key = IF(@round_attempt_key > 0, 'SELECT 1',
 'ALTER TABLE interviews ADD UNIQUE KEY uk_interview_round_attempt (batch_id, student_id, laboratory_id, `round`, attempt_no)');
PREPARE create_attempt_key FROM @create_attempt_key;
EXECUTE create_attempt_key;
DEALLOCATE PREPARE create_attempt_key;

SET @legacy_attempt_key = (SELECT COUNT(*) FROM information_schema.STATISTICS
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'interviews' AND INDEX_NAME = 'uk_interview_attempt');
SET @drop_attempt_key = IF(@legacy_attempt_key > 0, 'ALTER TABLE interviews DROP INDEX uk_interview_attempt', 'SELECT 1');
PREPARE drop_attempt_key FROM @drop_attempt_key;
EXECUTE drop_attempt_key;
DEALLOCATE PREPARE drop_attempt_key;
