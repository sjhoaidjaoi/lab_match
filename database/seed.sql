-- =====================================================================
-- 软件学院学生实训室双向选拔与统筹调剂管理平台  演示种子数据
-- 密码统一 123456（bcrypt hash）
-- 首次由应用自动生成时直接调用 bcryptjs.hashSync('123456', 10) 更可靠
-- =====================================================================

USE lab_match;

-- 重置
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE notices;
TRUNCATE TABLE announcements;
TRUNCATE TABLE media_panoramas;
TRUNCATE TABLE media_videos;
TRUNCATE TABLE final_admissions;
TRUNCATE TABLE adjustments;
TRUNCATE TABLE admission_intentions;
TRUNCATE TABLE interviews;
TRUNCATE TABLE student_preferences;
TRUNCATE TABLE recruitment_stages;
TRUNCATE TABLE recruitment_batches;
TRUNCATE TABLE laboratories;
TRUNCATE TABLE operation_logs;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- 用户（密码请用 Node.js 动态生成 bcrypt）
INSERT INTO users (id, username, password_hash, real_name, student_number, role, phone, status) VALUES
(1, 'admin',    '请用 bcryptjs.hashSync("123456", 10) 替换', '张老师', NULL,   'COLLEGE_ADMIN', '13800000000', 'ACTIVE'),
(2, 'L001',     '请用 bcryptjs.hashSync("123456", 10) 替换', '李敏',   'L001', 'LAB_LEADER',    '13800000001', 'ACTIVE'),
(3, 'T1001',    '请用 bcryptjs.hashSync("123456", 10) 替换', '王强',   'T1001','LAB_TEACHER',  '13800000002', 'ACTIVE'),
(4, 'T1002',    '请用 bcryptjs.hashSync("123456", 10) 替换', '赵雪',   'T1002','LAB_TEACHER',  '13800000003', 'ACTIVE'),
(5, '2022001',  '请用 bcryptjs.hashSync("123456", 10) 替换', '陈晨',   '2022001','STUDENT',      '13900000001', 'ACTIVE'),
(6, '2022002',  '请用 bcryptjs.hashSync("123456", 10) 替换', '林小雨', '2022002','STUDENT',      '13900000002', 'ACTIVE'),
(7, '2022003',  '请用 bcryptjs.hashSync("123456", 10) 替换', '周航',   '2022003','STUDENT',      '13900000003', 'ACTIVE');

-- 实训室
INSERT INTO laboratories (id, name, description, project_direction, technology_stack, recruitment_quota, leader_id, introduction_video, panoramic_resource, status) VALUES
(1, '智能软件工程实训室',   '聚焦软件架构、微服务与智能代码生成', '软件工程 / AI 工程化', 'Java / Spring Boot / Vue3 / Kubernetes', 6, 2, '/media/demo/lab-1-briefing.mp4', 'https://www.720yun.com/demo-lab-1', 'ACTIVE'),
(2, '计算机视觉与机器学习实训室', 'CV、NLP、大模型微调',          'AI / 计算机视觉',      'Python / PyTorch / OpenCV',                   5, NULL, '/media/demo/lab-2-briefing.mp4', 'https://www.720yun.com/demo-lab-2', 'ACTIVE'),
(3, '大数据与分布式系统实训室',   '数据工程、分布式计算与数据湖',   '大数据 / 分布式',      'Scala / Spark / Flink / ClickHouse',          4, NULL, NULL, NULL, 'ACTIVE');

-- 选拔批次
INSERT INTO recruitment_batches (id, batch_name, academic_year, description, status) VALUES
(1, '2026 届实训室选拔', '2025-2026', '软件学院 2026 届实训室进组选拔活动', 'IN_PROGRESS');

-- 八阶段时间窗（默认各 1 天，学院管理员可调整）
INSERT INTO recruitment_stages (batch_id, stage_number, stage_key, stage_name, start_time, end_time, stage_status, description) VALUES
(1, 1, 'BRIEFING',           '集中宣讲',                 NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY), 'COMPLETED',  '学院组织统一宣讲'),
(1, 2, 'OPEN_DAY',           '实训室开放日',              NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY), 'COMPLETED',  '开放日 + 720° 全景云游'),
(1, 3, 'PREFERENCE',         '学生意向填报',             NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY), 'IN_PROGRESS','最多 3 个平行志愿 + 2 项调剂意愿'),
(1, 4, 'INTERVIEW',          '导师初选与面试考核',       DATE_ADD(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 2 DAY), 'NOT_STARTED','实训室统一面试'),
(1, 5, 'ADMISSION_CONFIRM',  '拟录取与学生确认',         DATE_ADD(NOW(), INTERVAL 2 DAY), DATE_ADD(NOW(), INTERVAL 3 DAY), 'NOT_STARTED','单意向自动确认 / 多意向自主选择'),
(1, 6, 'INTERNAL_SUPPLEMENT','实训室内部调剂',            DATE_ADD(NOW(), INTERVAL 3 DAY), DATE_ADD(NOW(), INTERVAL 4 DAY), 'NOT_STARTED','组长主导内部调剂'),
(1, 7, 'COLLEGE_ADJUSTMENT', '学院统筹调剂',             DATE_ADD(NOW(), INTERVAL 4 DAY), DATE_ADD(NOW(), INTERVAL 5 DAY), 'NOT_STARTED','跨实训室 + 沟通安置'),
(1, 8, 'FINAL_PUBLICITY',    '结果公示与正式入组',       DATE_ADD(NOW(), INTERVAL 5 DAY), DATE_ADD(NOW(), INTERVAL 7 DAY), 'NOT_STARTED','公示 + 异议 + 正式入组');

-- 志愿
INSERT INTO student_preferences (batch_id, student_id, laboratory_id, obey_internal_adjustment, obey_college_adjustment, submitted_at, status) VALUES
(1, 5, 1, 1, 1, NOW(), 'SUBMITTED'),
(1, 5, 2, 1, 1, NOW(), 'SUBMITTED'),
(1, 6, 1, 0, 0, NOW(), 'SUBMITTED'),
(1, 6, 3, 1, 1, NOW(), 'SUBMITTED'),
(1, 7, 2, 1, 0, NOW(), 'SUBMITTED');

-- 宣讲视频
INSERT INTO media_videos (laboratory_id, title, description, video_type, video_url, duration_seconds, sort_no, status) VALUES
(1, '智能软件工程实训室宣讲视频', '实训室李敏老师宣讲', 'MP4',  '/media/demo/lab-1-briefing-1.mp4', 300, 1, 'PUBLISHED'),
(2, '计算机视觉实训室宣讲视频',   '实训室负责人宣讲',   'LINK', 'https://www.bilibili.com/video/demo-cv', 420, 1, 'PUBLISHED');

-- 全景云游
INSERT INTO media_panoramas (laboratory_id, name, description, panorama_type, panorama_url, sort_no, status) VALUES
(1, '智能软件工程实训室全景', '720° 全景展示实训室环境与设备', 'LINK', 'https://www.720yun.com/demo-lab-1', 1, 'PUBLISHED'),
(2, '计算机视觉实训室全景',   '实训室开放日云游入口',          'LINK', 'https://www.720yun.com/demo-lab-2', 1, 'PUBLISHED');

-- 公告
INSERT INTO announcements (batch_id, title, content, status, created_by) VALUES
(1, '2026 届实训室选拔启动', '学院发布本次选拔活动说明与时间安排',     'PUBLISHED', 1),
(1, '集中宣讲安排通知',     '宣讲将于 X 月 X 日晚 19:00 在学院报告厅举行', 'PUBLISHED', 1);
