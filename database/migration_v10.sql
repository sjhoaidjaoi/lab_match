-- ============================================================
-- migration_v10：实训室资料统一管理
-- 1) 实训室基础资料字段（学院统一维护）
-- 2) 教师资料字段（教师与登录账号分离）
-- 3) 学年招生计划 / 教师学年名额 / 宣传资料 三张新表
-- 非破坏性：只新增字段与表，不删除、不改写既有业务数据
-- 说明：由 db.js 迁移流程按顺序执行一次；重复执行前段 ALTER 会报字段已存在，属预期
-- ============================================================

-- ---------- 1. 实训室基础资料 ----------
ALTER TABLE laboratories ADD COLUMN lab_code VARCHAR(32) NULL COMMENT '实训室编号（202/204/...）';
ALTER TABLE laboratories ADD COLUMN college VARCHAR(128) NULL COMMENT '所属学院';
ALTER TABLE laboratories ADD COLUMN location VARCHAR(128) NULL COMMENT '实训室位置';
ALTER TABLE laboratories ADD COLUMN detail MEDIUMTEXT NULL COMMENT '详细介绍';
ALTER TABLE laboratories ADD COLUMN research_direction VARCHAR(512) NULL COMMENT '主要研究方向';
ALTER TABLE laboratories ADD COLUMN features TEXT NULL COMMENT '实训室特色';
ALTER TABLE laboratories ADD COLUMN achievements MEDIUMTEXT NULL COMMENT '主要研究成果';
ALTER TABLE laboratories ADD COLUMN equipment MEDIUMTEXT NULL COMMENT '设备及资源';
ALTER TABLE laboratories ADD COLUMN contact VARCHAR(512) NULL COMMENT '联系方式';
ALTER TABLE laboratories ADD COLUMN remark TEXT NULL COMMENT '其他备注';
ALTER TABLE laboratories ADD UNIQUE KEY uk_lab_code (lab_code);

-- ---------- 2. 教师资料 ----------
ALTER TABLE lab_teachers ADD COLUMN employee_no VARCHAR(64) NULL COMMENT '教师编号';
ALTER TABLE lab_teachers ADD COLUMN gender VARCHAR(8) NULL COMMENT '性别（可选）';
ALTER TABLE lab_teachers ADD COLUMN degree VARCHAR(64) NULL COMMENT '学历/学位';
ALTER TABLE lab_teachers ADD COLUMN project TEXT NULL COMMENT '负责项目';
ALTER TABLE lab_teachers ADD COLUMN email VARCHAR(128) NULL COMMENT '联系邮箱';
ALTER TABLE lab_teachers ADD COLUMN office VARCHAR(128) NULL COMMENT '办公地点';
ALTER TABLE lab_teachers ADD COLUMN photo_url VARCHAR(1024) NULL COMMENT '教师照片';
ALTER TABLE lab_teachers ADD COLUMN remark TEXT NULL COMMENT '其他备注';
ALTER TABLE lab_teachers ADD COLUMN identity ENUM('LEADER','TEACHER') NOT NULL DEFAULT 'TEACHER' COMMENT '教师身份：组长/普通教师';
ALTER TABLE lab_teachers ADD COLUMN deleted_at DATETIME NULL COMMENT '软删除时间：解除关联但保留历史业务记录';
ALTER TABLE lab_teachers ADD KEY idx_lab_teacher_lab (laboratory_id, deleted_at);

-- ---------- 3. 学年招生计划 ----------
CREATE TABLE IF NOT EXISTS lab_yearly_plans (
  id BIGINT UNSIGNED PRIMARY KEY,
  laboratory_id BIGINT UNSIGNED NOT NULL,
  academic_year VARCHAR(16) NOT NULL COMMENT '学年，如 2026-2027',
  total_quota INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '实训室招生总名额',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  updated_by BIGINT UNSIGNED NULL,
  UNIQUE KEY uk_lab_year_plan (laboratory_id, academic_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='实训室学年招生计划';

-- ---------- 4. 教师学年名额 ----------
CREATE TABLE IF NOT EXISTS teacher_yearly_quotas (
  id BIGINT UNSIGNED PRIMARY KEY,
  laboratory_id BIGINT UNSIGNED NOT NULL,
  lab_teacher_id BIGINT UNSIGNED NOT NULL COMMENT '教师档案 ID（lab_teachers.id）',
  academic_year VARCHAR(16) NOT NULL,
  quota INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  UNIQUE KEY uk_teacher_year_quota (lab_teacher_id, academic_year),
  KEY idx_teacher_year_lab (laboratory_id, academic_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='教师学年招生名额分配';

-- ---------- 5. 宣传资料 ----------
CREATE TABLE IF NOT EXISTS lab_promotion_files (
  id CHAR(36) PRIMARY KEY,
  laboratory_id BIGINT UNSIGNED NOT NULL,
  file_name VARCHAR(180) NOT NULL COMMENT '原始文件名',
  store_name VARCHAR(160) NOT NULL COMMENT '存储文件名（磁盘/对象存储 key）',
  type ENUM('PPT','PDF','WORD','VIDEO','IMAGE') NOT NULL,
  mime_type VARCHAR(128) NOT NULL,
  size BIGINT UNSIGNED NOT NULL DEFAULT 0,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  uploader_name VARCHAR(64) NULL,
  created_at DATETIME NOT NULL,
  KEY idx_promotion_lab (laboratory_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='实训室宣传资料';
