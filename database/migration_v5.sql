ALTER TABLE interviews
  MODIFY COLUMN interviewer_id BIGINT UNSIGNED NULL,
  MODIFY COLUMN interview_time DATETIME NULL;

CREATE TABLE IF NOT EXISTS application_resumes (
  id VARCHAR(36) PRIMARY KEY,
  batch_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(180) NOT NULL,
  mime VARCHAR(128) NOT NULL,
  size INT UNSIGNED NOT NULL,
  submitted_at DATETIME NULL,
  UNIQUE KEY uk_resume_batch_student (batch_id, student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS recruitment_reviews (
  id BIGINT UNSIGNED PRIMARY KEY,
  batch_id BIGINT UNSIGNED NOT NULL,
  laboratory_id BIGINT UNSIGNED NOT NULL,
  extra_json JSON NOT NULL,
  KEY ix_review_batch_lab (batch_id, laboratory_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
