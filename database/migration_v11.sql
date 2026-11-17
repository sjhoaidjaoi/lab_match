CREATE TABLE IF NOT EXISTS interview_ai_jobs (
  id BIGINT UNSIGNED PRIMARY KEY,
  interview_id BIGINT UNSIGNED NOT NULL,
  recording_id CHAR(36) NOT NULL,
  policy_key CHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,
  phase VARCHAR(32) NOT NULL,
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  transcript_id BIGINT UNSIGNED NULL,
  draft_id BIGINT UNSIGNED NULL,
  approved_id BIGINT UNSIGNED NULL,
  checkpoint JSON NULL,
  model VARCHAR(160) NULL,
  error VARCHAR(240) NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uk_ai_recording (recording_id),
  UNIQUE KEY uk_ai_interview (interview_id),
  KEY idx_ai_status (status, id),
  CONSTRAINT fk_ai_job_interview FOREIGN KEY (interview_id) REFERENCES interviews(id),
  CONSTRAINT fk_ai_job_recording FOREIGN KEY (recording_id) REFERENCES interview_recordings(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS interview_ai_consents (
  id BIGINT UNSIGNED PRIMARY KEY,
  recording_id CHAR(36) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  policy_key CHAR(64) NOT NULL,
  notice TEXT NOT NULL,
  accepted TINYINT(1) NOT NULL,
  created_at DATETIME NOT NULL,
  KEY idx_ai_consent (recording_id, policy_key, user_id, id),
  CONSTRAINT fk_ai_consent_recording FOREIGN KEY (recording_id) REFERENCES interview_recordings(id),
  CONSTRAINT fk_ai_consent_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS interview_ai_versions (
  id BIGINT UNSIGNED PRIMARY KEY,
  job_id BIGINT UNSIGNED NOT NULL,
  base_id BIGINT UNSIGNED NULL,
  source_id BIGINT UNSIGNED NULL,
  type VARCHAR(24) NOT NULL,
  content JSON NOT NULL,
  model VARCHAR(160) NULL,
  author_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL,
  KEY idx_ai_version_job (job_id, id),
  CONSTRAINT fk_ai_version_job FOREIGN KEY (job_id) REFERENCES interview_ai_jobs(id),
  CONSTRAINT fk_ai_version_author FOREIGN KEY (author_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
