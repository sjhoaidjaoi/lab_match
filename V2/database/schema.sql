-- ============================================================
-- 软件学院学生实训室双向选拔与统筹调剂管理平台
-- 数据库结构 V0.1（骨架阶段，MySQL 8.0）
-- 说明：
--   1. 与 REQUIREMENTS.md 第五章 10 张核心表对应。
--   2. 补充了 round_no / is_current 字段，用于支持流程图第 6 步
--      「分轮补录（重新填报 + 再面试）」，该口径待学院确认。
--   3. 所有涉及名单、调剂、阶段状态的操作都应写 operation_logs。
-- ============================================================

CREATE DATABASE IF NOT EXISTS training_room_selection
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE training_room_selection;

-- 1. 用户
CREATE TABLE IF NOT EXISTS users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username      VARCHAR(64)  NOT NULL COMMENT '登录账号（学号/工号）',
  password_hash VARCHAR(255) NOT NULL,
  real_name     VARCHAR(64)  NOT NULL,
  student_number VARCHAR(32) NULL COMMENT '学号，教师为空',
  role          ENUM('STUDENT','LAB_TEACHER','LAB_LEADER','COLLEGE_ADMIN') NOT NULL,
  phone         VARCHAR(20)  NULL,
  status        TINYINT      NOT NULL DEFAULT 1 COMMENT '1 正常 0 禁用',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_username (username),
  KEY idx_role (role)
) ENGINE=InnoDB COMMENT='用户表';

-- 2. 实训室
CREATE TABLE IF NOT EXISTS laboratories (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name                VARCHAR(128) NOT NULL,
  description         TEXT NULL,
  project_direction   VARCHAR(255) NULL,
  technology_stack    VARCHAR(255) NULL,
  recruitment_quota   INT NOT NULL DEFAULT 0,
  leader_id           BIGINT UNSIGNED NULL COMMENT '组长 users.id',
  introduction_video  VARCHAR(512) NULL,
  panoramic_resource VARCHAR(512) NULL,
  status              TINYINT NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_leader (leader_id),
  CONSTRAINT fk_lab_leader FOREIGN KEY (leader_id) REFERENCES users (id)
) ENGINE=InnoDB COMMENT='实训室表';

-- 3. 选拔批次
CREATE TABLE IF NOT EXISTS recruitment_batches (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  batch_name    VARCHAR(128) NOT NULL,
  academic_year VARCHAR(16)  NOT NULL,
  description   TEXT NULL,
  status        ENUM('DRAFT','RUNNING','CLOSED') NOT NULL DEFAULT 'DRAFT',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_year (academic_year)
) ENGINE=InnoDB COMMENT='选拔批次表';

-- 4. 阶段时间
CREATE TABLE IF NOT EXISTS recruitment_stages (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  batch_id     BIGINT UNSIGNED NOT NULL,
  stage_number TINYINT NOT NULL COMMENT '1~8',
  stage_name   VARCHAR(64) NOT NULL,
  start_time   DATETIME NOT NULL,
  end_time     DATETIME NOT NULL,
  stage_status ENUM('NOT_STARTED','IN_PROGRESS','COMPLETED','PAUSED') NOT NULL DEFAULT 'NOT_STARTED',
  round_no     TINYINT NOT NULL DEFAULT 1 COMMENT '同一阶段的补录轮次，第 6 阶段可 >1',
  PRIMARY KEY (id),
  UNIQUE KEY uk_batch_stage_round (batch_id, stage_number, round_no),
  CONSTRAINT fk_stage_batch FOREIGN KEY (batch_id) REFERENCES recruitment_batches (id)
) ENGINE=InnoDB COMMENT='阶段时间表';

-- 5. 学生志愿（三志愿平行，无优先级；每人每轮最多 3 条）
CREATE TABLE IF NOT EXISTS student_preferences (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  batch_id      BIGINT UNSIGNED NOT NULL,
  student_id    BIGINT UNSIGNED NOT NULL,
  laboratory_id BIGINT UNSIGNED NOT NULL,
  round_no      TINYINT NOT NULL DEFAULT 1 COMMENT '补录轮次',
  submitted_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status        ENUM('DRAFT','SUBMITTED','LOCKED','CANCELLED') NOT NULL DEFAULT 'SUBMITTED',
  PRIMARY KEY (id),
  UNIQUE KEY uk_student_lab_round (batch_id, student_id, laboratory_id, round_no),
  KEY idx_round (batch_id, round_no),
  CONSTRAINT fk_pref_student FOREIGN KEY (student_id) REFERENCES users (id),
  CONSTRAINT fk_pref_lab FOREIGN KEY (laboratory_id) REFERENCES laboratories (id)
) ENGINE=InnoDB COMMENT='学生志愿表';

-- 5.1 学生-批次调剂意愿（独立于志愿，避免同一学生多条志愿记录不一致）
CREATE TABLE IF NOT EXISTS student_batch_wishes (
  id                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  batch_id               BIGINT UNSIGNED NOT NULL,
  student_id             BIGINT UNSIGNED NOT NULL,
  obey_internal_adjustment TINYINT(1) NOT NULL DEFAULT 0,
  obey_college_adjustment  TINYINT(1) NOT NULL DEFAULT 0,
  updated_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_batch_student (batch_id, student_id)
) ENGINE=InnoDB COMMENT='学生调剂意愿表';

-- 6. 面试记录
CREATE TABLE IF NOT EXISTS interviews (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  batch_id              BIGINT UNSIGNED NOT NULL,
  student_id            BIGINT UNSIGNED NOT NULL,
  laboratory_id         BIGINT UNSIGNED NOT NULL,
  interviewer_id        BIGINT UNSIGNED NOT NULL,
  round_no              TINYINT NOT NULL DEFAULT 1,
  interview_time        DATETIME NULL,
  interview_location    VARCHAR(128) NULL,
  interview_form        VARCHAR(32) NULL,
  interview_status      ENUM('PENDING','EVALUATED','ABSENT') NOT NULL DEFAULT 'PENDING',
  attitude_score        TINYINT NULL,
  logic_score           TINYINT NULL,
  programming_score     TINYINT NULL,
  time_commitment_score TINYINT NULL,
  comprehensive_score   TINYINT NULL,
  evaluation            TEXT NULL,
  recommendation        ENUM('ADMIT','ALTERNATE','REJECT') NULL,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_interview (batch_id, student_id, laboratory_id, interviewer_id, round_no),
  KEY idx_lab_status (laboratory_id, interview_status),
  CONSTRAINT fk_itv_student FOREIGN KEY (student_id) REFERENCES users (id)
) ENGINE=InnoDB COMMENT='面试记录表';

-- 7. 拟录取 / 递补
CREATE TABLE IF NOT EXISTS admission_intentions (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  batch_id              BIGINT UNSIGNED NOT NULL,
  student_id            BIGINT UNSIGNED NOT NULL,
  laboratory_id         BIGINT UNSIGNED NOT NULL,
  admission_type        ENUM('INTENDED','ALTERNATE') NOT NULL,
  order_no              INT NULL COMMENT '递补顺位，拟录取为 NULL',
  status                ENUM('PENDING','CONFIRMED','ABANDONED','RELEASED') NOT NULL DEFAULT 'PENDING',
  confirmation_deadline DATETIME NULL,
  confirmed_at          DATETIME NULL,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_student_lab_type (batch_id, student_id, laboratory_id, admission_type),
  KEY idx_lab_type (laboratory_id, admission_type, order_no)
) ENGINE=InnoDB COMMENT='拟录取记录表';

-- 8. 调剂记录
CREATE TABLE IF NOT EXISTS adjustments (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  batch_id              BIGINT UNSIGNED NOT NULL,
  student_id            BIGINT UNSIGNED NOT NULL,
  source_laboratory_id  BIGINT UNSIGNED NULL,
  target_laboratory_id  BIGINT UNSIGNED NOT NULL,
  adjustment_type       ENUM('INTERNAL','CROSS_LAB','MANUAL_PLACEMENT') NOT NULL,
  priority_level        TINYINT NOT NULL COMMENT '1 内部 2 跨室 3 沟通安置',
  reason                VARCHAR(512) NOT NULL COMMENT '每次调剂必须记录原因',
  operator_id           BIGINT UNSIGNED NOT NULL,
  status                ENUM('DRAFT','WAIT_STUDENT','CONFIRMED','REJECTED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_batch_type (batch_id, adjustment_type, status)
) ENGINE=InnoDB COMMENT='调剂记录表';

-- 9. 最终录取
CREATE TABLE IF NOT EXISTS final_admissions (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  batch_id         BIGINT UNSIGNED NOT NULL,
  student_id       BIGINT UNSIGNED NOT NULL,
  laboratory_id    BIGINT UNSIGNED NOT NULL,
  admission_source ENUM('INTENDED','ALTERNATE','INTERNAL','CROSS_LAB','MANUAL_PLACEMENT') NOT NULL,
  final_status     ENUM('PUBLISHED','CONFIRMED','DISPUTED','WITHDRAWN') NOT NULL DEFAULT 'PUBLISHED',
  confirmed_at     DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_final_student (batch_id, student_id),
  KEY idx_final_lab (batch_id, laboratory_id)
) ENGINE=InnoDB COMMENT='最终录取表';

-- 10. 操作日志
CREATE TABLE IF NOT EXISTS operation_logs (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  operator_id           BIGINT UNSIGNED NOT NULL,
  operation_type        VARCHAR(64) NOT NULL,
  target_type           VARCHAR(64) NOT NULL,
  target_id             BIGINT UNSIGNED NULL,
  operation_description VARCHAR(512) NULL,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_operator_time (operator_id, created_at),
  KEY idx_target (target_type, target_id)
) ENGINE=InnoDB COMMENT='操作日志表';
