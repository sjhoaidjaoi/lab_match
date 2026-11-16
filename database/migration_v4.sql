CREATE TABLE IF NOT EXISTS student_preference_submissions (
  batch_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  submitted_at DATETIME NOT NULL,
  PRIMARY KEY (batch_id, student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO student_preference_submissions (batch_id, student_id, submitted_at)
SELECT batch_id, student_id, MIN(submitted_at)
FROM student_preferences
WHERE status = 'SUBMITTED'
GROUP BY batch_id, student_id;
