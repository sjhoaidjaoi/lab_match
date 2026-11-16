-- =====================================================================
-- 需求验收修复迁移脚本 v2
-- 适用：在 database/schema.sql 初始化后的数据库上执行一次
-- 内容：
--   1. 用户绑定实训室（教师/组长数据隔离所需）
--   2. 面试、拟录取唯一约束（防止重复安排与重复拟录取）
--   3. 最终名单审核表 final_reviews
--   4. 公示异议表 publication_objections
--   5. 开放日安排表 open_day_schedules
--   6. 实训室培养计划等宣讲字段
-- =====================================================================

USE lab_match;

-- 1. 用户绑定实训室：教师 / 组长只能访问该实训室数据
ALTER TABLE users
  ADD COLUMN laboratory_id BIGINT UNSIGNED DEFAULT NULL COMMENT '所属实训室（教师/组长）' AFTER phone,
  ADD INDEX idx_lab (laboratory_id),
  ADD CONSTRAINT fk_user_lab FOREIGN KEY (laboratory_id) REFERENCES laboratories(id) ON DELETE SET NULL;

-- 2. 唯一约束：同一批次 / 学生 / 实训室只有一条面试记录和一条拟录取记录
ALTER TABLE interviews
  ADD UNIQUE KEY uk_interview_batch_student_lab (batch_id, student_id, laboratory_id);

ALTER TABLE admission_intentions
  ADD UNIQUE KEY uk_intend_batch_student_lab (batch_id, student_id, laboratory_id);

-- 3. 最终名单审核记录（阶段八：审核最终录取名单）
CREATE TABLE IF NOT EXISTS final_reviews (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  batch_id BIGINT UNSIGNED NOT NULL,
  reviewer_id BIGINT UNSIGNED NOT NULL,
  status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  note VARCHAR(1000) DEFAULT NULL,
  reviewed_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_batch_review (batch_id),
  CONSTRAINT fk_review_batch FOREIGN KEY (batch_id) REFERENCES recruitment_batches(id) ON DELETE CASCADE,
  CONSTRAINT fk_review_user FOREIGN KEY (reviewer_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='最终录取名单审核';

-- 4. 公示异议（阶段八：异议登记与处理）
CREATE TABLE IF NOT EXISTS publication_objections (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  batch_id BIGINT UNSIGNED DEFAULT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  type VARCHAR(64) NOT NULL COMMENT '异议类型',
  content TEXT NOT NULL,
  status ENUM('PENDING','PROCESSING','RESOLVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  handler_id BIGINT UNSIGNED DEFAULT NULL,
  handling_note TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  handled_at DATETIME DEFAULT NULL,
  INDEX idx_student (student_id),
  CONSTRAINT fk_obj_student FOREIGN KEY (student_id) REFERENCES users(id),
  CONSTRAINT fk_obj_handler FOREIGN KEY (handler_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='公示异议';

-- 5. 开放日安排（阶段二）
CREATE TABLE IF NOT EXISTS open_day_schedules (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  batch_id BIGINT UNSIGNED NOT NULL,
  laboratory_id BIGINT UNSIGNED NOT NULL,
  open_date DATE NOT NULL,
  start_time VARCHAR(16) NOT NULL,
  end_time VARCHAR(16) NOT NULL,
  location VARCHAR(255) DEFAULT NULL,
  capacity INT UNSIGNED DEFAULT NULL,
  description TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_batch_lab (batch_id, laboratory_id),
  CONSTRAINT fk_open_batch FOREIGN KEY (batch_id) REFERENCES recruitment_batches(id) ON DELETE CASCADE,
  CONSTRAINT fk_open_lab FOREIGN KEY (laboratory_id) REFERENCES laboratories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='开放日安排';

-- 6. 宣讲内容字段（阶段一）
ALTER TABLE laboratories
  ADD COLUMN briefing_text TEXT COMMENT '宣讲文字资料' AFTER description,
  ADD COLUMN briefing_video_url VARCHAR(512) DEFAULT NULL COMMENT '宣讲视频地址' AFTER briefing_text,
  ADD COLUMN training_plan TEXT COMMENT '培养计划' AFTER technology_stack,
  ADD COLUMN basic_requirement TEXT COMMENT '学生基础要求' AFTER training_plan,
  ADD COLUMN assessment_method VARCHAR(500) COMMENT '考核方式' AFTER basic_requirement;
