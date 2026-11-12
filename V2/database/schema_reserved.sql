-- ============================================================
-- 预留表：默认不执行，对应功能上线时并入 schema.sql
-- 目的：先把跨端共用的数据结构定下来，避免各端重复设计
-- ============================================================

USE training_room_selection;

-- 1. 教师 / 组长 ↔ 实训室 多对多授权
--    解决：一个教师被授权管理多个实训室、组长只管理本室
CREATE TABLE IF NOT EXISTS user_laboratories (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  laboratory_id BIGINT UNSIGNED NOT NULL,
  role_in_lab   ENUM('TEACHER','LEADER') NOT NULL DEFAULT 'TEACHER',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_lab (user_id, laboratory_id),
  KEY idx_lab (laboratory_id),
  CONSTRAINT fk_ul_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_ul_lab FOREIGN KEY (laboratory_id) REFERENCES laboratories (id)
) ENGINE=InnoDB COMMENT='教师实训室授权表（预留）';

-- 2. 文件与附件：简历、成绩单、宣讲视频、全景资源共用
CREATE TABLE IF NOT EXISTS files (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_id    BIGINT UNSIGNED NOT NULL COMMENT '上传人 users.id',
  biz_type    ENUM('RESUME','TRANSCRIPT','BRIEFING_VIDEO','PANORAMA','OTHER') NOT NULL,
  biz_id      BIGINT UNSIGNED NULL COMMENT '关联业务 id，如 student/lab',
  file_name   VARCHAR(255) NOT NULL,
  storage_key VARCHAR(512) NOT NULL COMMENT '本地路径或对象存储 key',
  mime_type   VARCHAR(128) NULL,
  size_bytes  BIGINT UNSIGNED NULL,
  status      ENUM('ACTIVE','DELETED') NOT NULL DEFAULT 'ACTIVE',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_biz (biz_type, biz_id),
  KEY idx_owner (owner_id),
  CONSTRAINT fk_file_owner FOREIGN KEY (owner_id) REFERENCES users (id)
) ENGINE=InnoDB COMMENT='文件与附件表（预留）';

-- 3. 站内通知：学生确认/放弃、审核退回、调剂结果、阶段变更
CREATE TABLE IF NOT EXISTS notifications (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  type       VARCHAR(64) NOT NULL,
  title      VARCHAR(255) NOT NULL,
  content    VARCHAR(1024) NULL,
  link       VARCHAR(255) NULL,
  is_read    TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_read (user_id, is_read, created_at),
  CONSTRAINT fk_notify_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB COMMENT='站内通知表（预留）';

-- 4. 公告与宣讲通知：学院发布，学生/教师共同展示
CREATE TABLE IF NOT EXISTS announcements (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  batch_id    BIGINT UNSIGNED NULL,
  title       VARCHAR(255) NOT NULL,
  content     TEXT NULL,
  audience    ENUM('ALL','STUDENT','TEACHER','LEADER') NOT NULL DEFAULT 'ALL',
  publisher_id BIGINT UNSIGNED NOT NULL,
  published_at DATETIME NULL,
  status      ENUM('DRAFT','PUBLISHED','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  PRIMARY KEY (id),
  KEY idx_batch_status (batch_id, status),
  CONSTRAINT fk_ann_batch FOREIGN KEY (batch_id) REFERENCES recruitment_batches (id)
) ENGINE=InnoDB COMMENT='公告表（预留）';
