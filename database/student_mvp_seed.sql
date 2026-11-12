-- Run once on an empty test database created with schema.sql.
-- Then apply student_mvp_upgrade.sql to create resumes and complete the six labs.
USE lab_match;

CREATE TABLE IF NOT EXISTS laboratory_teachers (
    laboratory_id BIGINT UNSIGNED NOT NULL,
    teacher_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (laboratory_id, teacher_id),
    FOREIGN KEY (laboratory_id) REFERENCES laboratories(id),
    FOREIGN KEY (teacher_id) REFERENCES users(id)
) ENGINE=InnoDB;

START TRANSACTION;
-- Test accounts share the password 123456.
SET @demo_password = '$2a$10$Zwkct9xlwDtVoI1ITmNeJu77I7lKSE1vHqeIkIa4DFUT/yGATUN56';

INSERT INTO users (username, password_hash, real_name, student_number, role) VALUES
    ('2022001', @demo_password, '演示学生甲', '2022001', 'STUDENT'),
    ('2022002', @demo_password, '演示学生乙', '2022002', 'STUDENT'),
    ('T1001', @demo_password, '演示教师甲', 'T1001', 'LAB_TEACHER'),
    ('T1002', @demo_password, '演示教师乙', 'T1002', 'LAB_TEACHER'),
    ('L001', @demo_password, '演示组长', 'L001', 'LAB_LEADER'),
    ('admin', @demo_password, '演示学院管理员', NULL, 'COLLEGE_ADMIN');

SET @leader = (SELECT id FROM users WHERE username = 'L001');
INSERT INTO laboratories (name, description, project_direction, technology_stack, recruitment_quota, leader_id)
VALUES ('软件工程实训室', '校内管理应用开发', '软件工程', 'Vue 3 / Spring Boot / MySQL', 6, @leader);
SET @software = LAST_INSERT_ID();
INSERT INTO laboratories (name, description, project_direction, technology_stack, recruitment_quota)
VALUES ('人工智能实训室', '图像识别应用实践', '计算机视觉', 'Python / PyTorch', 5);
SET @vision = LAST_INSERT_ID();

INSERT INTO laboratory_teachers (laboratory_id, teacher_id)
SELECT IF(username = 'T1001', @software, @vision), id FROM users WHERE username IN ('T1001', 'T1002');

INSERT INTO recruitment_batches (batch_name, academic_year, description, status)
VALUES ('学生端联调批次', '2026-2027', '用于验证志愿、面试、拟录取和公示', 'IN_PROGRESS');
SET @batch = LAST_INSERT_ID();
INSERT INTO recruitment_stages (batch_id, stage_number, stage_key, stage_name, start_time, end_time, stage_status) VALUES
    (@batch, 3, 'PREFERENCE', '学生意向填报', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL 7 DAY, 'IN_PROGRESS'),
    (@batch, 5, 'ADMISSION_CONFIRM', '拟录取与学生确认', CURRENT_TIMESTAMP + INTERVAL 7 DAY,
        CURRENT_TIMESTAMP + INTERVAL 8 DAY, 'NOT_STARTED');
COMMIT;
