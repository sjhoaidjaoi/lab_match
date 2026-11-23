-- 同一学生可在不同轮次重报同一实训室。先建新索引，以保留外键所需的索引前缀。
ALTER TABLE student_preferences ADD UNIQUE KEY uk_preference_round (batch_id, student_id, laboratory_id, `round`);
SET @legacy_key = (SELECT COUNT(*) FROM information_schema.STATISTICS
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student_preferences' AND INDEX_NAME = 'uk_batch_student_lab');
SET @ddl = IF(@legacy_key > 0, 'ALTER TABLE student_preferences DROP INDEX uk_batch_student_lab', 'SELECT 1');
PREPARE drop_old_key FROM @ddl;
EXECUTE drop_old_key;
DEALLOCATE PREPARE drop_old_key;

ALTER TABLE admission_intentions ADD UNIQUE KEY uk_intend_round (batch_id, student_id, laboratory_id, `round`);
SET @legacy_key = (SELECT COUNT(*) FROM information_schema.STATISTICS
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'admission_intentions' AND INDEX_NAME = 'uk_intend_batch_student_lab');
SET @ddl = IF(@legacy_key > 0, 'ALTER TABLE admission_intentions DROP INDEX uk_intend_batch_student_lab', 'SELECT 1');
PREPARE drop_old_key FROM @ddl;
EXECUTE drop_old_key;
DEALLOCATE PREPARE drop_old_key;
