ALTER TABLE interviews ADD COLUMN online_locked_at DATETIME NULL;
ALTER TABLE interviews ADD COLUMN online_media_started_at DATETIME NULL;
ALTER TABLE interview_participants MODIFY participant_role ENUM('HOST','CANDIDATE','PANEL','OBSERVER') NOT NULL;
ALTER TABLE interview_participants ADD COLUMN waiting_status ENUM('WAITING','APPROVED','REJECTED','CANCELLED') NULL;
ALTER TABLE interview_participants ADD COLUMN requested_at DATETIME NULL;
ALTER TABLE interview_participants ADD COLUMN decided_at DATETIME NULL;
ALTER TABLE interview_participants ADD COLUMN granted_at DATETIME NULL;
ALTER TABLE interview_participants ADD COLUMN removed_at DATETIME NULL;
ALTER TABLE interview_participants ADD COLUMN removed_by BIGINT UNSIGNED NULL;
ALTER TABLE interview_participants ADD COLUMN removal_reason VARCHAR(200) NULL;
ALTER TABLE interview_participants ADD COLUMN revoked_at DATETIME NULL;
ALTER TABLE interview_participants ADD COLUMN hand_order INT UNSIGNED NULL;
ALTER TABLE interview_participants ADD COLUMN mute_requested_at DATETIME NULL;

CREATE TABLE IF NOT EXISTS interview_messages (
  id BIGINT UNSIGNED PRIMARY KEY,
  interview_id BIGINT UNSIGNED NOT NULL,
  sender_id BIGINT UNSIGNED NOT NULL,
  client_id CHAR(36) NOT NULL,
  content VARCHAR(1000) NOT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uk_interview_message_retry (interview_id, sender_id, client_id),
  KEY idx_interview_messages (interview_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS interview_attendance (
  id BIGINT UNSIGNED PRIMARY KEY,
  interview_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  room_sid VARCHAR(80) NOT NULL,
  participant_sid VARCHAR(80) NOT NULL,
  joined_at DATETIME NULL,
  left_at DATETIME NULL,
  online_seconds INT UNSIGNED NULL,
  disconnect_reason VARCHAR(64) NULL,
  removed_at DATETIME NULL,
  UNIQUE KEY uk_interview_connection (room_sid, participant_sid),
  KEY idx_interview_attendance (interview_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS interview_webhook_events (
  id VARCHAR(128) PRIMARY KEY,
  interview_id BIGINT UNSIGNED NOT NULL,
  event_type VARCHAR(48) NOT NULL,
  room_sid VARCHAR(80) NOT NULL,
  event_at DATETIME NOT NULL,
  KEY idx_interview_webhook_events (interview_id, event_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
