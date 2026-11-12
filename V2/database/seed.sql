USE training_room_selection;

-- 演示批次
INSERT INTO recruitment_batches (id, batch_name, academic_year, description, status)
VALUES (1, '2026 年软件学院实训室选拔', '2026-2027', '骨架演示数据', 'RUNNING')
ON DUPLICATE KEY UPDATE batch_name = VALUES(batch_name);

-- 八阶段（时间取自学院流程图）
INSERT INTO recruitment_stages (batch_id, stage_number, stage_name, start_time, end_time, stage_status) VALUES
(1, 1, '集中宣讲',              '2026-10-28 19:00:00', '2026-10-28 21:00:00', 'COMPLETED'),
(1, 2, '实训室开放日',          '2026-10-29 09:00:00', '2026-10-30 17:00:00', 'COMPLETED'),
(1, 3, '学生意向填报',          '2026-11-02 08:00:00', '2026-11-02 12:00:00', 'COMPLETED'),
(1, 4, '导师初选与面试考核',    '2026-11-02 12:00:00', '2026-11-03 17:00:00', 'COMPLETED'),
(1, 5, '拟录取与学生确认',      '2026-11-04 08:00:00', '2026-11-04 12:00:00', 'IN_PROGRESS'),
(1, 6, '分轮补录（内部调剂）',  '2026-11-04 12:00:00', '2026-11-05 17:00:00', 'NOT_STARTED'),
(1, 7, '统筹调剂录取',          '2026-11-06 08:00:00', '2026-11-06 12:00:00', 'NOT_STARTED'),
(1, 8, '结果公示与正式入组',    '2026-11-07 08:00:00', '2026-11-08 08:00:00', 'NOT_STARTED')
ON DUPLICATE KEY UPDATE stage_name = VALUES(stage_name);

-- 演示账号（密码统一为 123456 的 bcrypt 占位，第二阶段替换）
INSERT INTO users (id, username, password_hash, real_name, student_number, role) VALUES
(1, 'admin',   '$2b$10$placeholder', '学院负责人', NULL, 'COLLEGE_ADMIN'),
(2, 'leader1', '$2b$10$placeholder', '王老师',     NULL, 'LAB_LEADER'),
(3, 'teacher1','$2b$10$placeholder', '赵老师',     NULL, 'LAB_TEACHER'),
(100, '2025017001', '$2b$10$placeholder', '张明', '2025017001', 'STUDENT')
ON DUPLICATE KEY UPDATE real_name = VALUES(real_name);

-- 实训室
INSERT INTO laboratories (id, name, description, project_direction, technology_stack, recruitment_quota, leader_id, status) VALUES
(1, '智能感知与机器人实训室', '面向机器人感知与强化学习', '机器人感知 / 强化学习', 'Python / C++ / ROS / PyTorch', 10, 2, 1),
(2, '数据智能实训室',         '面向数据挖掘与推荐系统', '数据挖掘 / 推荐系统',   'Python / SQL / Spark',          8,  NULL, 1),
(3, '嵌入式与边缘计算实训室', '面向嵌入式与边缘 AI',     '嵌入式 / 边缘 AI',      'C / Linux / TensorRT',          6,  NULL, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);
