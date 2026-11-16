-- =====================================================================
-- 需求验收修复迁移脚本 v3
-- 适用：已执行 schema.sql + migration_v2.sql 的数据库
-- 说明：脚本按“可重复执行”编写，已存在的列/表/索引会自动跳过
-- 内容：
--   1. 用户邮箱字段（个人信息维护）
--   2. 实训室导师团队表 lab_teachers
--   3. 实训室宣讲视频类型、剩余名额上报字段
--   4. 开放日场次字段与空批次兼容
--   5. 公示异议状态补充“已采纳”
--   6. 所有业务表增加 extra_json，用于保存尚未建列的扩展字段，避免 MySQL 模式丢数据
-- =====================================================================

USE lab_match;

-- 1. 个人信息
ALTER TABLE users ADD COLUMN email VARCHAR(128) DEFAULT NULL COMMENT '邮箱' AFTER phone;

-- 2. 实训室导师团队（一个实训室可有多名导师）
CREATE TABLE IF NOT EXISTS lab_teachers (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  laboratory_id BIGINT UNSIGNED NOT NULL COMMENT '所属实训室',
  user_id BIGINT UNSIGNED DEFAULT NULL COMMENT '关联账号（可为空，仅登记姓名）',
  name VARCHAR(64) NOT NULL COMMENT '导师姓名',
  title VARCHAR(64) DEFAULT NULL COMMENT '职称/职务',
  direction VARCHAR(255) DEFAULT NULL COMMENT '研究方向',
  intro TEXT COMMENT '导师简介',
  sort_no INT UNSIGNED NOT NULL DEFAULT 1,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lab_sort (laboratory_id, sort_no),
  CONSTRAINT fk_lab_teacher_lab FOREIGN KEY (laboratory_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  CONSTRAINT fk_lab_teacher_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='实训室导师团队';

-- 3. 实训室扩展字段
ALTER TABLE laboratories ADD COLUMN briefing_video_type ENUM('MP4','LINK','EMBED') NOT NULL DEFAULT 'LINK' COMMENT '宣讲视频类型' AFTER briefing_video_url;
ALTER TABLE laboratories ADD COLUMN vacancy_report JSON DEFAULT NULL COMMENT '组长上报的剩余名额';

-- 4. 开放日场次：兼容未绑定批次的场次，并补齐前端使用字段
ALTER TABLE open_day_schedules MODIFY COLUMN batch_id BIGINT UNSIGNED NULL COMMENT '所属批次（可为空）';
ALTER TABLE open_day_schedules ADD COLUMN date DATE DEFAULT NULL COMMENT '开放日期' AFTER laboratory_id;
ALTER TABLE open_day_schedules ADD COLUMN title VARCHAR(200) DEFAULT NULL COMMENT '场次主题' AFTER date;
ALTER TABLE open_day_schedules ADD COLUMN note VARCHAR(500) DEFAULT NULL COMMENT '备注' AFTER location;

-- 5. 公示异议：补充“已采纳”状态
ALTER TABLE publication_objections MODIFY COLUMN status ENUM('PENDING','PROCESSING','ACCEPTED','RESOLVED','REJECTED') NOT NULL DEFAULT 'PENDING';

-- 6. 扩展字段兜底列（避免 MySQL 模式丢失尚未建模的字段）
ALTER TABLE users ADD COLUMN extra_json JSON DEFAULT NULL;
ALTER TABLE laboratories ADD COLUMN extra_json JSON DEFAULT NULL;
ALTER TABLE recruitment_batches ADD COLUMN extra_json JSON DEFAULT NULL;
ALTER TABLE recruitment_stages ADD COLUMN extra_json JSON DEFAULT NULL;
ALTER TABLE student_preferences ADD COLUMN extra_json JSON DEFAULT NULL;
ALTER TABLE interviews ADD COLUMN extra_json JSON DEFAULT NULL;
ALTER TABLE admission_intentions ADD COLUMN extra_json JSON DEFAULT NULL;
ALTER TABLE adjustments ADD COLUMN extra_json JSON DEFAULT NULL;
ALTER TABLE final_admissions ADD COLUMN extra_json JSON DEFAULT NULL;
ALTER TABLE operation_logs ADD COLUMN extra_json JSON DEFAULT NULL;
ALTER TABLE announcements ADD COLUMN extra_json JSON DEFAULT NULL;
ALTER TABLE media_videos ADD COLUMN extra_json JSON DEFAULT NULL;
ALTER TABLE media_panoramas ADD COLUMN extra_json JSON DEFAULT NULL;
ALTER TABLE notices ADD COLUMN extra_json JSON DEFAULT NULL;
ALTER TABLE publication ADD COLUMN extra_json JSON DEFAULT NULL;
ALTER TABLE final_reviews ADD COLUMN extra_json JSON DEFAULT NULL;
ALTER TABLE publication_objections ADD COLUMN extra_json JSON DEFAULT NULL;
ALTER TABLE open_day_schedules ADD COLUMN extra_json JSON DEFAULT NULL;
ALTER TABLE lab_teachers ADD COLUMN extra_json JSON DEFAULT NULL;
