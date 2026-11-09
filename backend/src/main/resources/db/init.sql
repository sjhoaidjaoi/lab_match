-- =============================================================
-- 学生实训室进组选拔平台 · 数据库初始化脚本
-- MySQL 8.0+，字符集 utf8mb4
-- 用法：mysql -u root -p < init.sql
-- 说明：演示账号与业务数据由后端 DemoDataInitializer 在首次启动时生成
-- =============================================================

CREATE DATABASE IF NOT EXISTS lab_match
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE lab_match;

-- ---------------------------------------------------------------
-- 0. 账号与角色
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_account (
  id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
  login_name           VARCHAR(64)  NOT NULL COMMENT '学号/工号，登录名',
  student_no           VARCHAR(32)  NULL,
  employee_no          VARCHAR(32)  NULL,
  name                 VARCHAR(64)  NOT NULL,
  phone                VARCHAR(32)  NULL,
  email                VARCHAR(128) NULL,
  status               VARCHAR(16)  NOT NULL DEFAULT 'ENABLED' COMMENT 'ENABLED/DISABLED',
  password_hash        VARCHAR(128) NOT NULL,
  must_change_password TINYINT(1)   NOT NULL DEFAULT 0,
  last_login_at        DATETIME     NULL,
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_login_name (login_name)
) ENGINE=InnoDB COMMENT='账号';

CREATE TABLE IF NOT EXISTS user_role (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT      NOT NULL,
  role_code  VARCHAR(32) NOT NULL COMMENT 'STUDENT/MENTOR/LAB_HEAD/COLLEGE_ADMIN/SYS_ADMIN',
  scope_type VARCHAR(16) NOT NULL COMMENT 'SELF/LAB/COLLEGE/ALL',
  scope_id   BIGINT      NULL,
  active     TINYINT(1)  NOT NULL DEFAULT 1,
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user_active (user_id, active)
) ENGINE=InnoDB COMMENT='账号角色';

-- ---------------------------------------------------------------
-- 1. 周期、轮次
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cycle (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(128) NOT NULL,
  cycle_year      INT          NOT NULL,
  status          VARCHAR(16)  NOT NULL DEFAULT 'DRAFT' COMMENT 'DRAFT/RUNNING/CLOSED',
  current_round   INT          NOT NULL DEFAULT 1,
  announce_at     DATETIME     NULL COMMENT '集中宣讲时间',
  open_day_start  DATETIME     NULL,
  open_day_end    DATETIME     NULL,
  adjust_start    DATETIME     NULL COMMENT '统筹调剂开始',
  adjust_end      DATETIME     NULL,
  publicity_start DATETIME     NULL COMMENT '公示开始',
  publicity_end   DATETIME     NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_status (status)
) ENGINE=InnoDB COMMENT='选拔周期';

CREATE TABLE IF NOT EXISTS round (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  cycle_id        BIGINT      NOT NULL,
  round_no        INT         NOT NULL COMMENT '1/2/3',
  status          VARCHAR(16) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING/OPEN/INTERVIEW/CONFIRM/CLOSED',
  apply_start     DATETIME    NULL,
  apply_end       DATETIME    NULL,
  interview_start DATETIME    NULL,
  interview_end   DATETIME    NULL,
  confirm_start   DATETIME    NULL,
  confirm_end     DATETIME    NULL,
  created_at      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_cycle_round (cycle_id, round_no)
) ENGINE=InnoDB COMMENT='轮次';

-- ---------------------------------------------------------------
-- 2. 实训室、导师、名额
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lab (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(128) NOT NULL,
  department      VARCHAR(128) NULL,
  leader_id       BIGINT       NULL COMMENT '负责人 user_id',
  intro           TEXT         NULL,
  directions      VARCHAR(512) NULL COMMENT '研究方向，逗号分隔',
  facilities      TEXT         NULL,
  training_plan   TEXT         NULL,
  assessment      TEXT         NULL,
  open_day_info   VARCHAR(512) NULL,
  total_quota     INT          NOT NULL DEFAULT 0,
  status          VARCHAR(16)  NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE/INACTIVE',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='实训室';

CREATE TABLE IF NOT EXISTS mentor_profile (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT       NOT NULL,
  lab_id        BIGINT       NOT NULL,
  title         VARCHAR(64)  NULL COMMENT '职称',
  direction     VARCHAR(255) NULL,
  projects      TEXT         NULL,
  training_plan TEXT         NULL,
  assessment    TEXT         NULL,
  quota_suggest INT          NOT NULL DEFAULT 0,
  status        VARCHAR(16)  NOT NULL DEFAULT 'ACTIVE',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user (user_id),
  KEY idx_lab (lab_id)
) ENGINE=InnoDB COMMENT='导师档案';

CREATE TABLE IF NOT EXISTS lab_quota (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  cycle_id   BIGINT   NOT NULL,
  lab_id     BIGINT   NOT NULL,
  mentor_id  BIGINT   NOT NULL COMMENT 'mentor_profile.id',
  quota      INT      NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_cycle_mentor (cycle_id, mentor_id),
  KEY idx_lab (lab_id)
) ENGINE=InnoDB COMMENT='周期内名额配置';

CREATE TABLE IF NOT EXISTS lab_quota_snapshot (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  cycle_id    BIGINT   NOT NULL,
  lab_id      BIGINT   NOT NULL,
  mentor_id   BIGINT   NOT NULL,
  quota       INT      NOT NULL,
  snapshot_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_cycle (cycle_id)
) ENGINE=InnoDB COMMENT='名额基线快照';

CREATE TABLE IF NOT EXISTS quota_balance (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  cycle_id   BIGINT   NOT NULL,
  mentor_id  BIGINT   NOT NULL,
  quota      INT      NOT NULL DEFAULT 0,
  used       INT      NOT NULL DEFAULT 0,
  reserved   INT      NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_cycle_mentor (cycle_id, mentor_id)
) ENGINE=InnoDB COMMENT='名额余额（used + reserved <= quota）';

CREATE TABLE IF NOT EXISTS quota_ledger (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  cycle_id    BIGINT      NOT NULL,
  mentor_id   BIGINT      NOT NULL,
  entry_type  VARCHAR(16) NOT NULL COMMENT 'INIT/ADJUST/RESERVE/RELEASE/FILL/VOID',
  qty         INT         NOT NULL,
  ref_type    VARCHAR(32) NULL,
  ref_id      BIGINT      NULL,
  note        VARCHAR(255) NULL,
  operator_id BIGINT      NULL,
  created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_mentor_ref_type (mentor_id, ref_id, entry_type),
  KEY idx_cycle_mentor (cycle_id, mentor_id)
) ENGINE=InnoDB COMMENT='名额台账（只追加）';

-- ---------------------------------------------------------------
-- 3. 宣讲与开放日
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS announcement (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  cycle_id   BIGINT       NOT NULL,
  title      VARCHAR(200) NOT NULL,
  type       VARCHAR(32)  NOT NULL COMMENT 'BRIEFING/OPEN_DAY/PUBLICITY/NOTICE',
  content    LONGTEXT     NULL,
  status     VARCHAR(16)  NOT NULL DEFAULT 'DRAFT' COMMENT 'DRAFT/INTERNAL_REVIEW/PUBLISHED/LOCKED/WITHDRAWN',
  publish_at DATETIME     NULL,
  created_by BIGINT       NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_cycle_status (cycle_id, status)
) ENGINE=InnoDB COMMENT='公告';

CREATE TABLE IF NOT EXISTS open_day_plan (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  cycle_id   BIGINT       NOT NULL,
  lab_id     BIGINT       NOT NULL,
  date_at    DATE         NOT NULL,
  start_time VARCHAR(8)   NULL,
  end_time   VARCHAR(8)   NULL,
  location   VARCHAR(128) NULL,
  note       VARCHAR(255) NULL,
  status     VARCHAR(16)  NOT NULL DEFAULT 'DRAFT',
  KEY idx_lab_date (lab_id, date_at)
) ENGINE=InnoDB COMMENT='开放日安排';

-- ---------------------------------------------------------------
-- 4. 意向填报（阶段三）
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS application (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  cycle_id     BIGINT      NOT NULL,
  round        INT         NOT NULL,
  student_id   BIGINT      NOT NULL,
  status       VARCHAR(16) NOT NULL DEFAULT 'DRAFT' COMMENT 'DRAFT/SUBMITTED/LOCKED/VOID',
  submitted_at DATETIME    NULL,
  receipt_no   VARCHAR(64) NULL,
  created_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_cycle_round_student (cycle_id, round, student_id),
  KEY idx_student (student_id)
) ENGINE=InnoDB COMMENT='报名单';

CREATE TABLE IF NOT EXISTS intent (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  application_id BIGINT      NOT NULL,
  mentor_id      BIGINT      NOT NULL,
  lab_id         BIGINT      NOT NULL,
  status         VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE/WITHDRAWN/INVALID',
  created_at     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_app_mentor (application_id, mentor_id),
  KEY idx_mentor (mentor_id)
) ENGINE=InnoDB COMMENT='意向（最多3个，不分先后）';

CREATE TABLE IF NOT EXISTS adjustment_consent (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  application_id BIGINT      NOT NULL,
  scope_code     VARCHAR(16) NOT NULL COMMENT 'L1实训室内/L2全院跨室/L3跨学院',
  accepted       TINYINT(1)  NOT NULL DEFAULT 0,
  snapshot_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_app_scope (application_id, scope_code)
) ENGINE=InnoDB COMMENT='调剂同意（一行一级）';

CREATE TABLE IF NOT EXISTS student_statement (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  application_id BIGINT   NOT NULL,
  version        INT      NOT NULL DEFAULT 1,
  content        LONGTEXT NULL,
  submitted_at   DATETIME NULL,
  UNIQUE KEY uk_app_version (application_id, version)
) ENGINE=InnoDB COMMENT='个人陈述';

CREATE TABLE IF NOT EXISTS submission_receipt (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  application_id    BIGINT       NOT NULL,
  receipt_no        VARCHAR(64)  NOT NULL,
  content_snapshot  LONGTEXT     NULL,
  submitted_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_receipt_no (receipt_no)
) ENGINE=InnoDB COMMENT='提交回执';

-- ---------------------------------------------------------------
-- 5. 问卷与面试（阶段四）
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS questionnaire (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  cycle_id   BIGINT      NOT NULL,
  lab_id     BIGINT      NOT NULL,
  mentor_id  BIGINT      NOT NULL,
  round      INT         NOT NULL,
  version    INT         NOT NULL DEFAULT 1,
  status     VARCHAR(16) NOT NULL DEFAULT 'DRAFT' COMMENT 'DRAFT/FROZEN/CLOSED',
  time_limit INT         NULL COMMENT '限时（分钟）',
  frozen_at  DATETIME    NULL,
  created_by BIGINT      NULL,
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_mentor_round_version (mentor_id, round, version)
) ENGINE=InnoDB COMMENT='问卷';

CREATE TABLE IF NOT EXISTS question (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  questionnaire_id BIGINT       NOT NULL,
  seq              INT          NOT NULL,
  type             VARCHAR(32)  NOT NULL COMMENT 'SINGLE/MULTI/TEXT/LONG_TEXT/SCALE/CODE',
  title            VARCHAR(500) NOT NULL,
  body             TEXT         NULL,
  required         TINYINT(1)   NOT NULL DEFAULT 1,
  options_json     TEXT         NULL,
  score_hint       INT          NULL,
  max_length       INT          NULL,
  KEY idx_questionnaire_seq (questionnaire_id, seq)
) ENGINE=InnoDB COMMENT='题目';

CREATE TABLE IF NOT EXISTS questionnaire_interview (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  cycle_id         BIGINT      NOT NULL,
  round            INT         NOT NULL,
  mentor_id        BIGINT      NOT NULL,
  student_id       BIGINT      NOT NULL,
  questionnaire_id BIGINT      NULL,
  status           VARCHAR(16) NOT NULL DEFAULT 'NOT_STARTED'
                   COMMENT 'NOT_STARTED/IN_PROGRESS/SUBMITTED/INCOMPLETE/SCORED/LISTED',
  started_at       DATETIME    NULL,
  submitted_at     DATETIME    NULL,
  deadline_at      DATETIME    NULL,
  UNIQUE KEY uk_mentor_student_round (mentor_id, student_id, round),
  KEY idx_student (student_id)
) ENGINE=InnoDB COMMENT='面试实例（一份意向一份）';

CREATE TABLE IF NOT EXISTS response (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  interview_id BIGINT   NOT NULL,
  answers_json LONGTEXT NULL,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_interview (interview_id)
) ENGINE=InnoDB COMMENT='问卷作答';

CREATE TABLE IF NOT EXISTS score (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  interview_id BIGINT      NOT NULL,
  dim_code     VARCHAR(16) NOT NULL COMMENT 'ATTITUDE/LOGIC/CODING/TIME',
  value        DECIMAL(5,2) NOT NULL,
  updated_by   BIGINT      NULL,
  updated_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_interview_dim (interview_id, dim_code)
) ENGINE=InnoDB COMMENT='四维评分';

CREATE TABLE IF NOT EXISTS mentor_comment (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  interview_id BIGINT   NOT NULL,
  content      TEXT     NULL,
  updated_by   BIGINT   NULL,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_interview (interview_id)
) ENGINE=InnoDB COMMENT='面试评语';

CREATE TABLE IF NOT EXISTS mentor_list (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  cycle_id    BIGINT       NOT NULL,
  mentor_id   BIGINT       NOT NULL,
  round       INT          NOT NULL,
  type        VARCHAR(24)  NOT NULL COMMENT 'ADMIT/WAITLIST/INTERNAL_CANDIDATE',
  student_id  BIGINT       NOT NULL,
  rank_no     INT          NULL,
  reason      VARCHAR(255) NULL,
  status      VARCHAR(16)  NOT NULL DEFAULT 'DRAFT' COMMENT 'DRAFT/SUBMITTED/LOCKED',
  submitted_at DATETIME    NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_mentor_round_type_student (mentor_id, round, type, student_id),
  KEY idx_cycle_round (cycle_id, round)
) ENGINE=InnoDB COMMENT='导师名单：拟录取/递补/内部候选';

-- ---------------------------------------------------------------
-- 6. Offer 与确认（阶段五）
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS offer (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  cycle_id     BIGINT      NOT NULL,
  round        INT         NOT NULL,
  mentor_id    BIGINT      NOT NULL,
  student_id   BIGINT      NOT NULL,
  status       VARCHAR(32) NOT NULL DEFAULT 'ISSUED'
               COMMENT 'ISSUED/PENDING/AUTO_CONFIRMED/CONFIRMED/DECLINED/EXPIRED/INVALIDATED_BY_CHOICE/REVOKED/WITHDRAWN/DIRECT_ASSIGNED',
  issued_at    DATETIME    NULL,
  expire_at    DATETIME    NULL,
  confirmed_at DATETIME    NULL,
  created_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_mentor_student_round (mentor_id, student_id, round),
  KEY idx_student (student_id),
  KEY idx_status (status)
) ENGINE=InnoDB COMMENT='拟录取 Offer';

CREATE TABLE IF NOT EXISTS offer_event (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  offer_id    BIGINT       NOT NULL,
  from_status VARCHAR(32)  NULL,
  to_status   VARCHAR(32)  NOT NULL,
  reason      VARCHAR(255) NULL,
  operator_id BIGINT       NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_offer_at (offer_id, created_at)
) ENGINE=InnoDB COMMENT='Offer 状态变化（只追加）';

CREATE TABLE IF NOT EXISTS confirmation (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  offer_id   BIGINT       NOT NULL,
  action     VARCHAR(16)  NOT NULL COMMENT 'ACCEPT/DECLINE/EXPIRE',
  note       VARCHAR(255) NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_offer (offer_id)
) ENGINE=InnoDB COMMENT='学生确认记录';

-- ---------------------------------------------------------------
-- 7. 补录（阶段六）
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vacancy_publication (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  cycle_id    BIGINT   NOT NULL,
  round_no    INT      NOT NULL,
  mentor_id   BIGINT   NOT NULL,
  available   INT      NOT NULL DEFAULT 0,
  published_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_round_mentor (round_no, mentor_id)
) ENGINE=InnoDB COMMENT='剩余名额公布';

CREATE TABLE IF NOT EXISTS round_result (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  cycle_id         BIGINT   NOT NULL,
  round_no         INT      NOT NULL,
  confirmed_count  INT      NOT NULL DEFAULT 0,
  vacancies_after  INT      NOT NULL DEFAULT 0,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_round (round_no)
) ENGINE=InnoDB COMMENT='轮次结算';

-- ---------------------------------------------------------------
-- 8. 统筹调剂（阶段七）
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS adjustment_pool (
  id       BIGINT AUTO_INCREMENT PRIMARY KEY,
  cycle_id BIGINT      NOT NULL,
  scope_code VARCHAR(16) NOT NULL COMMENT 'L1/L2/L3',
  status   VARCHAR(16) NOT NULL DEFAULT 'BUILT',
  built_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='调剂池';

CREATE TABLE IF NOT EXISTS adjustment_entry (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  pool_id          BIGINT      NOT NULL,
  student_id       BIGINT      NOT NULL,
  target_mentor_id BIGINT      NULL,
  source_lab_id    BIGINT      NULL,
  status           VARCHAR(16) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING/ASSIGNED/DECLINED/TALK',
  assigned_at      DATETIME    NULL,
  operator_id      BIGINT      NULL,
  UNIQUE KEY uk_pool_student (pool_id, student_id)
) ENGINE=InnoDB COMMENT='调剂明细';

CREATE TABLE IF NOT EXISTS talk_record (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  cycle_id    BIGINT       NOT NULL,
  student_id  BIGINT       NOT NULL,
  result      VARCHAR(64)  NULL,
  note        VARCHAR(500) NULL,
  operator_id BIGINT       NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_student (student_id)
) ENGINE=InnoDB COMMENT='谈话安置记录';

-- ---------------------------------------------------------------
-- 9. 公示、异议、入组（阶段八）
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS publication (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  cycle_id   BIGINT       NOT NULL,
  round_no   INT          NULL,
  title      VARCHAR(200) NOT NULL,
  status     VARCHAR(16)  NOT NULL DEFAULT 'DRAFT' COMMENT 'DRAFT/PUBLISHED/LOCKED/WITHDRAWN',
  publish_at DATETIME     NULL,
  expire_at  DATETIME     NULL,
  created_by BIGINT       NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_cycle_status (cycle_id, status)
) ENGINE=InnoDB COMMENT='公示';

CREATE TABLE IF NOT EXISTS publication_item (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  publication_id BIGINT      NOT NULL,
  student_id     BIGINT      NOT NULL,
  student_no     VARCHAR(32) NULL,
  student_name   VARCHAR(64) NULL,
  lab_id         BIGINT      NULL,
  mentor_id      BIGINT      NULL,
  UNIQUE KEY uk_pub_student (publication_id, student_id)
) ENGINE=InnoDB COMMENT='公示名单快照';

CREATE TABLE IF NOT EXISTS objection (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  publication_id BIGINT       NOT NULL,
  student_id     BIGINT       NOT NULL,
  type           VARCHAR(32)  NOT NULL COMMENT 'RESULT_ERROR/QUOTA_UNFAIR/INFO_ERROR/OTHER',
  content        TEXT         NOT NULL,
  attachments_json TEXT       NULL,
  status         VARCHAR(16)  NOT NULL DEFAULT 'OPEN' COMMENT 'OPEN/PROCESSING/RESOLVED/REJECTED',
  reply          TEXT         NULL,
  handler_id     BIGINT       NULL,
  handled_at     DATETIME     NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pub_status (publication_id, status)
) ENGINE=InnoDB COMMENT='异议工单';

CREATE TABLE IF NOT EXISTS enrollment (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  cycle_id    BIGINT   NOT NULL,
  student_id  BIGINT   NOT NULL,
  lab_id      BIGINT   NOT NULL,
  mentor_id   BIGINT   NOT NULL,
  enrolled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_student (student_id)
) ENGINE=InnoDB COMMENT='正式入组';

-- ---------------------------------------------------------------
-- 10. 通知与审计
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT       NOT NULL,
  title      VARCHAR(200) NOT NULL,
  content    TEXT         NULL,
  type       VARCHAR(32)  NULL COMMENT 'SYSTEM/APPLICATION/INTERVIEW/OFFER/PUBLICATION/OBJECTION',
  is_read    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at    DATETIME     NULL,
  KEY idx_user_created (user_id, created_at)
) ENGINE=InnoDB COMMENT='站内通知';

CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  actor_id    BIGINT       NULL,
  role_code   VARCHAR(32)  NULL,
  action      VARCHAR(64)  NOT NULL,
  target_type VARCHAR(64)  NULL,
  target_id   BIGINT       NULL,
  detail_json TEXT         NULL,
  ip          VARCHAR(64)  NULL,
  ua          VARCHAR(255) NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_actor_at (actor_id, created_at)
) ENGINE=InnoDB COMMENT='操作审计';

CREATE TABLE IF NOT EXISTS access_log (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  actor_id    BIGINT       NOT NULL,
  target_type VARCHAR(64)  NOT NULL,
  target_id   BIGINT       NOT NULL,
  reason      VARCHAR(255) NOT NULL COMMENT '查看敏感内容的理由（Q-03）',
  ip          VARCHAR(64)  NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_actor_at (actor_id, created_at)
) ENGINE=InnoDB COMMENT='敏感数据访问日志';

-- ---------------------------------------------------------------
-- 11. 集中宣讲视频（阶段一）与 720° 全景云游（阶段二）
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lab_video (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  lab_id           BIGINT       NOT NULL,
  title            VARCHAR(120) NOT NULL,
  description      VARCHAR(500) NULL,
  video_type       VARCHAR(20)  NOT NULL DEFAULT 'MP4' COMMENT 'MP4 直链 / LINK 外链页面 / EMBED 内嵌',
  video_url        VARCHAR(500) NOT NULL,
  cover_url        VARCHAR(500) NULL,
  duration_seconds INT          NULL,
  sort_no          INT          NOT NULL DEFAULT 0,
  status           VARCHAR(20)  NOT NULL DEFAULT 'PUBLISHED' COMMENT 'DRAFT/PUBLISHED',
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_lab_sort (lab_id, sort_no)
) ENGINE=InnoDB COMMENT='集中宣讲视频（阶段一）';

CREATE TABLE IF NOT EXISTS lab_panorama (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  lab_id        BIGINT       NOT NULL,
  name          VARCHAR(120) NOT NULL,
  description   VARCHAR(500) NULL,
  panorama_type VARCHAR(20)  NOT NULL DEFAULT 'LINK' COMMENT 'LINK 第三方全景链接 / IMAGE 等距柱状全景图',
  panorama_url  VARCHAR(500) NOT NULL,
  cover_url     VARCHAR(500) NULL,
  sort_no       INT          NOT NULL DEFAULT 0,
  status        VARCHAR(20)  NOT NULL DEFAULT 'PUBLISHED' COMMENT 'DRAFT/PUBLISHED',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_lab_sort (lab_id, sort_no)
) ENGINE=InnoDB COMMENT='实训室开放日 720° 全景云游（阶段二）';
