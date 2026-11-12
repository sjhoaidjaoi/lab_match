-- =====================================================================
-- 软件学院学生实训室双向选拔与统筹调剂管理平台  schema
-- 严格对齐新文档 5.1 ~ 5.10 节核心表定义
-- 共 10 张核心表 + 辅助表（媒体、公告、通知）
-- =====================================================================

CREATE DATABASE IF NOT EXISTS lab_match DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE lab_match;

-- 角色枚举
-- STUDENT / LAB_TEACHER / LAB_LEADER / COLLEGE_ADMIN

-- --------- 5.1 users ---------
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL UNIQUE COMMENT '登录账号',
  password_hash VARCHAR(255) NOT NULL COMMENT 'bcrypt',
  real_name VARCHAR(64) NOT NULL COMMENT '真实姓名',
  student_number VARCHAR(64) DEFAULT NULL COMMENT '学号或工号',
  role ENUM('STUDENT','LAB_TEACHER','LAB_LEADER','COLLEGE_ADMIN') NOT NULL COMMENT '核心角色',
  phone VARCHAR(20) DEFAULT NULL,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_role (role),
  INDEX idx_student_number (student_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- --------- 5.2 laboratories ---------
DROP TABLE IF EXISTS laboratories;
CREATE TABLE laboratories (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(128) NOT NULL COMMENT '实训室名称',
  description TEXT COMMENT '实训室介绍',
  project_direction VARCHAR(255) COMMENT '项目研究方向',
  technology_stack VARCHAR(255) COMMENT '主要技术栈',
  recruitment_quota INT UNSIGNED NOT NULL DEFAULT 5 COMMENT '招生名额',
  leader_id BIGINT UNSIGNED DEFAULT NULL COMMENT '实训室组长（users.id，LAB_LEADER 角色）',
  introduction_video VARCHAR(512) DEFAULT NULL COMMENT '宣讲视频地址',
  panoramic_resource VARCHAR(512) DEFAULT NULL COMMENT '全景云游资源地址',
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_leader (leader_id),
  CONSTRAINT fk_lab_leader FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='实训室表';

-- --------- 5.3 recruitment_batches ---------
DROP TABLE IF EXISTS recruitment_batches;
CREATE TABLE recruitment_batches (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  batch_name VARCHAR(128) NOT NULL COMMENT '批次名称',
  academic_year VARCHAR(32) NOT NULL COMMENT '学年，如 2025-2026',
  description TEXT,
  status ENUM('DRAFT','IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'IN_PROGRESS',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='选拔批次表';

-- --------- 5.4 recruitment_stages ---------
DROP TABLE IF EXISTS recruitment_stages;
CREATE TABLE recruitment_stages (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  batch_id BIGINT UNSIGNED NOT NULL,
  stage_number TINYINT UNSIGNED NOT NULL COMMENT '1-8',
  stage_key VARCHAR(32) NOT NULL COMMENT 'BRIEFING/OPEN_DAY/PREFERENCE/INTERVIEW/ADMISSION_CONFIRM/INTERNAL_SUPPLEMENT/COLLEGE_ADJUSTMENT/FINAL_PUBLICITY',
  stage_name VARCHAR(64) NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  stage_status ENUM('NOT_STARTED','IN_PROGRESS','COMPLETED','PAUSED') NOT NULL DEFAULT 'NOT_STARTED',
  description TEXT,
  UNIQUE KEY uk_batch_stage (batch_id, stage_number),
  CONSTRAINT fk_stage_batch FOREIGN KEY (batch_id) REFERENCES recruitment_batches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='阶段时间表';

-- --------- 5.5 student_preferences ---------
DROP TABLE IF EXISTS student_preferences;
CREATE TABLE student_preferences (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  batch_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL COMMENT 'users.id（STUDENT 角色）',
  laboratory_id BIGINT UNSIGNED NOT NULL,
  obey_internal_adjustment TINYINT(1) NOT NULL DEFAULT 0,
  obey_college_adjustment TINYINT(1) NOT NULL DEFAULT 0,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('DRAFT','SUBMITTED','WITHDRAWN') NOT NULL DEFAULT 'SUBMITTED',
  UNIQUE KEY uk_batch_student_lab (batch_id, student_id, laboratory_id),
  CONSTRAINT fk_pref_batch FOREIGN KEY (batch_id) REFERENCES recruitment_batches(id),
  CONSTRAINT fk_pref_student FOREIGN KEY (student_id) REFERENCES users(id),
  CONSTRAINT fk_pref_lab FOREIGN KEY (laboratory_id) REFERENCES laboratories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学生志愿表';

-- --------- 5.6 interviews ---------
DROP TABLE IF EXISTS interviews;
CREATE TABLE interviews (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  batch_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  laboratory_id BIGINT UNSIGNED NOT NULL,
  interviewer_id BIGINT UNSIGNED NOT NULL COMMENT 'users.id（LAB_TEACHER 或 LAB_LEADER）',
  interview_time DATETIME NOT NULL,
  interview_status ENUM('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
  attitude_score INT UNSIGNED DEFAULT NULL COMMENT '学习态度 0-100',
  logic_score INT UNSIGNED DEFAULT NULL COMMENT '逻辑思维',
  programming_score INT UNSIGNED DEFAULT NULL COMMENT '编程基础',
  time_commitment_score INT UNSIGNED DEFAULT NULL COMMENT '时间投入',
  comprehensive_score INT UNSIGNED DEFAULT NULL COMMENT '综合表现',
  evaluation TEXT COMMENT '教师文字评价',
  recommendation ENUM('PENDING','INTENDED','ALTERNATE','REJECTED') NOT NULL DEFAULT 'PENDING',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lab (laboratory_id),
  INDEX idx_student (student_id),
  CONSTRAINT fk_interview_batch FOREIGN KEY (batch_id) REFERENCES recruitment_batches(id),
  CONSTRAINT fk_interview_student FOREIGN KEY (student_id) REFERENCES users(id),
  CONSTRAINT fk_interview_lab FOREIGN KEY (laboratory_id) REFERENCES laboratories(id),
  CONSTRAINT fk_interview_teacher FOREIGN KEY (interviewer_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='面试记录表';

-- --------- 5.7 admission_intentions ---------
DROP TABLE IF EXISTS admission_intentions;
CREATE TABLE admission_intentions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  batch_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  laboratory_id BIGINT UNSIGNED NOT NULL,
  admission_type ENUM('INTENDED','ALTERNATE') NOT NULL COMMENT '拟录取 / 递补',
  status ENUM('PENDING','CONFIRMED','REJECTED','EXPIRED') NOT NULL DEFAULT 'PENDING',
  confirmation_deadline DATETIME DEFAULT NULL,
  confirmed_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_student (student_id),
  INDEX idx_lab (laboratory_id),
  CONSTRAINT fk_intend_batch FOREIGN KEY (batch_id) REFERENCES recruitment_batches(id),
  CONSTRAINT fk_intend_student FOREIGN KEY (student_id) REFERENCES users(id),
  CONSTRAINT fk_intend_lab FOREIGN KEY (laboratory_id) REFERENCES laboratories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='拟录取记录表';

-- --------- 5.8 adjustments ---------
DROP TABLE IF EXISTS adjustments;
CREATE TABLE adjustments (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  batch_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  source_laboratory_id BIGINT UNSIGNED DEFAULT NULL COMMENT '来源实训室',
  target_laboratory_id BIGINT UNSIGNED NOT NULL COMMENT '目标实训室',
  adjustment_type ENUM('INTERNAL','CROSS_LAB','MANUAL_PLACEMENT') NOT NULL COMMENT '内部调剂 / 跨室 / 沟通安置',
  priority_level TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '1-3 优先级',
  reason VARCHAR(500) DEFAULT NULL COMMENT '调剂原因',
  operator_id BIGINT UNSIGNED NOT NULL COMMENT '操作人',
  status ENUM('PENDING','CONFIRMED','REJECTED') NOT NULL DEFAULT 'PENDING',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_student (student_id),
  INDEX idx_target_lab (target_laboratory_id),
  CONSTRAINT fk_adj_batch FOREIGN KEY (batch_id) REFERENCES recruitment_batches(id),
  CONSTRAINT fk_adj_student FOREIGN KEY (student_id) REFERENCES users(id),
  CONSTRAINT fk_adj_source_lab FOREIGN KEY (source_laboratory_id) REFERENCES laboratories(id),
  CONSTRAINT fk_adj_target_lab FOREIGN KEY (target_laboratory_id) REFERENCES laboratories(id),
  CONSTRAINT fk_adj_operator FOREIGN KEY (operator_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='调剂记录表';

-- --------- 5.9 final_admissions ---------
DROP TABLE IF EXISTS final_admissions;
CREATE TABLE final_admissions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  batch_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  laboratory_id BIGINT UNSIGNED NOT NULL,
  admission_source ENUM('INTENDED_CONFIRMED','INTERNAL','CROSS_LAB','MANUAL_PLACEMENT') NOT NULL,
  final_status ENUM('ADMITTED','ENROLLED','WITHDRAWN') NOT NULL DEFAULT 'ADMITTED',
  confirmed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_batch_student (batch_id, student_id),
  INDEX idx_lab (laboratory_id),
  CONSTRAINT fk_final_batch FOREIGN KEY (batch_id) REFERENCES recruitment_batches(id),
  CONSTRAINT fk_final_student FOREIGN KEY (student_id) REFERENCES users(id),
  CONSTRAINT fk_final_lab FOREIGN KEY (laboratory_id) REFERENCES laboratories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='最终录取表';

-- --------- 5.10 operation_logs ---------
DROP TABLE IF EXISTS operation_logs;
CREATE TABLE operation_logs (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  operator_id BIGINT UNSIGNED DEFAULT NULL,
  operation_type VARCHAR(64) NOT NULL COMMENT 'LOGIN/CREATE_BATCH/SUBMIT_PREFERENCE/SCORE_INTERVIEW/ADJUST/...',
  target_type VARCHAR(64) DEFAULT NULL COMMENT 'USERS/LABORATORIES/STUDENT_PREFERENCES/...',
  target_id VARCHAR(64) DEFAULT NULL,
  operation_description VARCHAR(1000) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_operator (operator_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作日志表';

-- ============ 辅助表 ============

-- 宣讲视频
DROP TABLE IF EXISTS media_videos;
CREATE TABLE media_videos (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  laboratory_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  video_type ENUM('MP4','LINK','EMBED') NOT NULL,
  video_url VARCHAR(512) NOT NULL,
  cover_url VARCHAR(512) DEFAULT NULL,
  duration_seconds INT UNSIGNED DEFAULT NULL,
  sort_no INT UNSIGNED NOT NULL DEFAULT 1,
  status ENUM('PUBLISHED','DRAFT') NOT NULL DEFAULT 'PUBLISHED',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lab_sort (laboratory_id, sort_no),
  CONSTRAINT fk_video_lab FOREIGN KEY (laboratory_id) REFERENCES laboratories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='宣讲视频';

-- 720° 全景云游资源
DROP TABLE IF EXISTS media_panoramas;
CREATE TABLE media_panoramas (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  laboratory_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  panorama_type ENUM('LINK','IMAGE') NOT NULL,
  panorama_url VARCHAR(512) NOT NULL,
  cover_url VARCHAR(512) DEFAULT NULL,
  sort_no INT UNSIGNED NOT NULL DEFAULT 1,
  status ENUM('PUBLISHED','DRAFT') NOT NULL DEFAULT 'PUBLISHED',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lab_sort (laboratory_id, sort_no),
  CONSTRAINT fk_pano_lab FOREIGN KEY (laboratory_id) REFERENCES laboratories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='全景云游';

-- 学院公告
DROP TABLE IF EXISTS announcements;
CREATE TABLE announcements (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  batch_id BIGINT UNSIGNED DEFAULT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  status ENUM('PUBLISHED','DRAFT') NOT NULL DEFAULT 'PUBLISHED',
  created_by BIGINT UNSIGNED DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ann_batch FOREIGN KEY (batch_id) REFERENCES recruitment_batches(id),
  CONSTRAINT fk_ann_creator FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学院公告';

-- 站内通知
DROP TABLE IF EXISTS notices;
CREATE TABLE notices (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  target_role VARCHAR(32) DEFAULT NULL COMMENT '定向角色（为 null 则发给所有人）',
  target_user_id BIGINT UNSIGNED DEFAULT NULL COMMENT '定向用户',
  title VARCHAR(200) NOT NULL,
  content TEXT,
  created_by BIGINT UNSIGNED DEFAULT NULL,
  read_flag TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='站内通知';

-- 最终名单公示
DROP TABLE IF EXISTS publication;
CREATE TABLE publication (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT CHECK (id = 1),
  batch_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  status ENUM('DRAFT','PUBLISHED','ENDED') NOT NULL DEFAULT 'DRAFT',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pub_batch FOREIGN KEY (batch_id) REFERENCES recruitment_batches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='最终公示';
