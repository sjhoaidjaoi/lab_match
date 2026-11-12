-- Apply after student_mvp_seed.sql, or to an existing MVP test database.
USE lab_match;

CREATE TABLE IF NOT EXISTS student_resumes (
    student_id BIGINT UNSIGNED PRIMARY KEY,
    phone VARCHAR(24) NOT NULL,
    major VARCHAR(80) NOT NULL,
    skills VARCHAR(300) NOT NULL,
    experience VARCHAR(1000) NOT NULL,
    introduction VARCHAR(500) NOT NULL,
    FOREIGN KEY (student_id) REFERENCES users(id)
) ENGINE=InnoDB;

START TRANSACTION;
INSERT INTO laboratories (name, description, project_direction, technology_stack, recruitment_quota)
SELECT demo.name, demo.description, demo.direction, demo.tools, demo.quota
FROM (
    SELECT '嵌入式与机器人实训室' AS name, '移动机器人开发实践' AS description,
           '嵌入式控制' AS direction, 'C / STM32 / ROS 2' AS tools, 6 AS quota
    UNION ALL SELECT '数据工程实训室', '数据清洗与可视化实践', '数据分析', 'Python / SQL / ECharts', 5
    UNION ALL SELECT '物联网实训室', '传感器接入与设备监控', '物联网应用', 'ESP32 / MQTT', 5
    UNION ALL SELECT '数字媒体实训室', '互动内容与三维原型开发', '数字媒体技术', 'Godot / Blender', 5
) AS demo
WHERE NOT EXISTS (SELECT 1 FROM laboratories l WHERE l.name = demo.name);

INSERT INTO laboratory_teachers (laboratory_id, teacher_id)
SELECT l.id, u.id FROM laboratories l
JOIN users u ON u.username = CASE
    WHEN l.name IN ('嵌入式与机器人实训室', '物联网实训室') THEN 'T1001'
    WHEN l.name IN ('数据工程实训室', '数字媒体实训室') THEN 'T1002'
END
WHERE NOT EXISTS (
    SELECT 1 FROM laboratory_teachers lt WHERE lt.laboratory_id = l.id AND lt.teacher_id = u.id
);
COMMIT;
