ALTER TABLE interviews ADD COLUMN preference_id BIGINT UNSIGNED NULL;
ALTER TABLE interviews ADD COLUMN attempt_no INT UNSIGNED NOT NULL DEFAULT 1;
ALTER TABLE interviews ADD COLUMN previous_interview_id BIGINT UNSIGNED NULL;
ALTER TABLE interviews ADD COLUMN rescheduled_at DATETIME NULL;
ALTER TABLE interviews ADD COLUMN acknowledged_at DATETIME NULL;
ALTER TABLE interviews ADD COLUMN exception_code VARCHAR(32) NULL;
ALTER TABLE interviews ADD COLUMN exception_note VARCHAR(400) NULL;
ALTER TABLE interviews ADD COLUMN exception_at DATETIME NULL;
ALTER TABLE interviews ADD UNIQUE KEY uk_interview_attempt (batch_id, student_id, laboratory_id, attempt_no);
SET @legacy_interview_key = (SELECT COUNT(*) FROM information_schema.STATISTICS
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'interviews' AND INDEX_NAME = 'uk_interview_batch_student_lab');
SET @replace_interview_key = IF(@legacy_interview_key > 0, 'ALTER TABLE interviews DROP INDEX uk_interview_batch_student_lab', 'SELECT 1');
PREPARE replace_interview_key FROM @replace_interview_key;
EXECUTE replace_interview_key;
DEALLOCATE PREPARE replace_interview_key;

UPDATE interviews i JOIN student_preferences p
 ON p.batch_id = i.batch_id AND p.student_id = i.student_id AND p.laboratory_id = i.laboratory_id AND p.status = 'SUBMITTED'
 SET i.preference_id = p.id WHERE i.preference_id IS NULL;

CREATE TABLE IF NOT EXISTS interview_score_policies (
  id BIGINT UNSIGNED PRIMARY KEY,
  batch_id BIGINT UNSIGNED NOT NULL,
  weights JSON NOT NULL,
  aggregation VARCHAR(16) NOT NULL,
  review_threshold DECIMAL(6,2) NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uk_interview_score_batch (batch_id),
  CONSTRAINT fk_interview_score_batch FOREIGN KEY (batch_id) REFERENCES recruitment_batches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS interview_evaluations (
  id BIGINT UNSIGNED PRIMARY KEY,
  interview_id BIGINT UNSIGNED NOT NULL,
  reviewer_id BIGINT UNSIGNED NOT NULL,
  version INT UNSIGNED NOT NULL,
  state ENUM('DRAFT','SUBMITTED') NOT NULL,
  scores JSON NOT NULL,
  weights JSON NOT NULL,
  total DECIMAL(6,2) NULL,
  evaluation TEXT NOT NULL,
  recommendation VARCHAR(16) NOT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uk_eval_version (interview_id, reviewer_id, version),
  KEY idx_eval_state (interview_id, state),
  CONSTRAINT fk_eval_interview FOREIGN KEY (interview_id) REFERENCES interviews(id),
  CONSTRAINT fk_eval_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE notices ADD COLUMN interview_id BIGINT UNSIGNED NULL;
ALTER TABLE notices ADD COLUMN destination VARCHAR(32) NULL;
ALTER TABLE notices ADD COLUMN batch_id BIGINT UNSIGNED NULL;
ALTER TABLE notices ADD COLUMN visible_at DATETIME NULL;
