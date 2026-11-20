-- LiveKit 会议信息附加到既有面试。NULL 表示普通面试或会议尚未开始/结束。
ALTER TABLE interviews ADD COLUMN online_room_name VARCHAR(64) NULL;
ALTER TABLE interviews ADD COLUMN online_preference_id BIGINT UNSIGNED NULL;
ALTER TABLE interviews ADD COLUMN online_started_at DATETIME NULL;
ALTER TABLE interviews ADD COLUMN online_ended_at DATETIME NULL;
ALTER TABLE interviews ADD COLUMN online_room_cleaned_at DATETIME NULL;
ALTER TABLE interviews ADD UNIQUE KEY uk_interview_online_room (online_room_name);

CREATE TABLE IF NOT EXISTS interview_participants (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  interview_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  participant_role ENUM('HOST','CANDIDATE','PANEL') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_interview_participant (interview_id, user_id),
  CONSTRAINT fk_interview_participant_interview FOREIGN KEY (interview_id) REFERENCES interviews(id),
  CONSTRAINT fk_interview_participant_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
