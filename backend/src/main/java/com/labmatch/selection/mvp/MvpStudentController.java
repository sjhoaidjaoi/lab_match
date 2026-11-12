package com.labmatch.selection.mvp;

import com.labmatch.selection.dto.resp.Result;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashSet;
import java.util.List;

@RestController
@RequestMapping("/api")
@Profile("mvp")
class MvpStudentController {
    private final JdbcTemplate jdbc;
    private final MvpAuthController auth;

    MvpStudentController(JdbcTemplate jdbc, MvpAuthController auth) {
        this.jdbc = jdbc;
        this.auth = auth;
    }

    record Lab(long id, String name, String description, String projectDirection,
               String technologyStack, int recruitmentQuota, String leaderName, String status) {}
    record PreferenceInput(List<Long> laboratories, Boolean obeyInternalAdjustment, Boolean obeyCollegeAdjustment) {}
    record Preference(long id, long batchId, long studentId, long laboratoryId, String laboratoryName,
                      boolean obeyInternalAdjustment, boolean obeyCollegeAdjustment, long submittedAt, String status) {}
    record Applicant(long id, long studentId, String studentName, String studentNumber,
                     boolean obeyInternalAdjustment, boolean obeyCollegeAdjustment, long submittedAt, String status,
                     Resume resume) {}
    record Resume(String phone, String major, String skills, String experience, String introduction) {}
    record Window(long end, boolean open) {}
    record Interview(long id, String labName, String interviewer, long time, String status) {}
    record Offer(long id, String labName, String status, long deadline, boolean actionable) {}
    record Outcome(String labName, String leader, String status) {}
    record Workspace(Window preferenceWindow, List<Interview> interviews, List<Offer> offers,
                     boolean published, Outcome outcome) {}

    @GetMapping("/laboratories")
    Result<List<Lab>> laboratories(HttpServletRequest request) {
        auth.requireUser(request);
        return Result.ok(jdbc.query("""
            SELECT l.*, u.real_name AS leader_name FROM laboratories l
            LEFT JOIN users u ON u.id = l.leader_id WHERE l.status = 'ACTIVE' ORDER BY l.id
            """, (row, index) -> new Lab(row.getLong("id"), row.getString("name"), row.getString("description"),
            row.getString("project_direction"), row.getString("technology_stack"), row.getInt("recruitment_quota"),
            row.getString("leader_name"), row.getString("status"))));
    }

    @GetMapping("/preferences/my")
    Result<List<Preference>> mine(HttpServletRequest request) {
        var user = auth.requireStudent(request);
        return Result.ok(preferences(batch(), user.id()));
    }

    @GetMapping("/student/resume")
    Result<Resume> myResume(HttpServletRequest request) {
        var user = auth.requireStudent(request);
        var resumes = jdbc.query("SELECT * FROM student_resumes WHERE student_id = ?",
            (row, index) -> readResume(row), user.id());
        return Result.ok(resumes.isEmpty() ? new Resume("", "", "", "", "") : resumes.get(0));
    }

    @PutMapping("/student/resume")
    Result<Resume> saveResume(HttpServletRequest request, @RequestBody Resume input) {
        var user = auth.requireStudent(request);
        var resume = new Resume(resumeField(input.phone(), 24), resumeField(input.major(), 80),
            resumeField(input.skills(), 300), resumeField(input.experience(), 1000),
            resumeField(input.introduction(), 500));
        if (!resume.phone().isEmpty() && !resume.phone().matches("\\+?[\\d ()-]{5,24}")) {
            throw error(HttpStatus.BAD_REQUEST, "请输入有效的联系电话");
        }
        jdbc.update("""
            INSERT INTO student_resumes (student_id, phone, major, skills, experience, introduction)
            VALUES (?, ?, ?, ?, ?, ?) AS incoming
            ON DUPLICATE KEY UPDATE phone = incoming.phone, major = incoming.major, skills = incoming.skills,
                experience = incoming.experience, introduction = incoming.introduction
            """, user.id(), resume.phone(), resume.major(), resume.skills(), resume.experience(), resume.introduction());
        return Result.ok(resume);
    }

    private static String resumeField(String value, int limit) {
        String clean = value == null ? "" : value.strip();
        if (clean.length() > limit) throw error(HttpStatus.BAD_REQUEST, "简历字段超过字数限制");
        return clean;
    }

    private static Resume readResume(ResultSet row) throws SQLException {
        return new Resume(row.getString("phone"), row.getString("major"), row.getString("skills"),
            row.getString("experience"), row.getString("introduction"));
    }

    @Transactional
    @PostMapping("/preferences/submit")
    Result<List<Preference>> submit(HttpServletRequest request, @RequestBody PreferenceInput input) {
        var user = auth.requireStudent(request);
        var ids = input.laboratories();
        if (ids == null || ids.isEmpty() || ids.size() > 3 ||
            ids.stream().anyMatch(id -> id == null || id <= 0) || new HashSet<>(ids).size() != ids.size() ||
            input.obeyInternalAdjustment() == null || input.obeyCollegeAdjustment() == null) {
            throw error(HttpStatus.BAD_REQUEST, "请选择一至三个不同实训室，并填写两项调剂意愿");
        }
        long batchId = batch();
        lockStudent(user.id());
        if (!window(batchId, true).open()) throw error(HttpStatus.CONFLICT, "当前不在志愿填报窗口");
        for (long id : ids.stream().sorted().toList()) {
            if (jdbc.queryForList("SELECT id FROM laboratories WHERE id = ? AND status = 'ACTIVE' FOR SHARE",
                Long.class, id).isEmpty()) throw error(HttpStatus.BAD_REQUEST, "所选实训室不可报名");
        }
        jdbc.update("DELETE FROM student_preferences WHERE batch_id = ? AND student_id = ?", batchId, user.id());
        jdbc.batchUpdate("""
            INSERT INTO student_preferences
                (batch_id, student_id, laboratory_id, obey_internal_adjustment, obey_college_adjustment)
            VALUES (?, ?, ?, ?, ?)
            """, ids.stream().map(id -> new Object[]{batchId, user.id(), id,
                input.obeyInternalAdjustment(), input.obeyCollegeAdjustment()}).toList());
        audit(user.id(), "SUBMIT_PREFERENCE", "STUDENT_PREFERENCES", batchId);
        return Result.ok(preferences(batchId, user.id()));
    }

    @GetMapping("/preferences/lab/{labId}")
    Result<List<Applicant>> applicants(HttpServletRequest request, @PathVariable long labId) {
        var user = auth.requireUser(request);
        boolean allowed = switch (user.role()) {
            case "LAB_TEACHER" -> !jdbc.queryForList("""
                SELECT laboratory_id FROM laboratory_teachers WHERE laboratory_id = ? AND teacher_id = ?
                """, Long.class, labId, user.id()).isEmpty();
            case "LAB_LEADER" -> !jdbc.queryForList("""
                SELECT id FROM laboratories WHERE id = ? AND leader_id = ?
                """, Long.class, labId, user.id()).isEmpty();
            default -> false;
        };
        if (!allowed) throw error(HttpStatus.FORBIDDEN, "无权查看该实训室报名");
        return Result.ok(jdbc.query("""
            SELECT p.*, u.real_name, u.student_number, UNIX_TIMESTAMP(p.submitted_at) AS submitted,
                r.student_id AS resume_owner, r.phone, r.major, r.skills, r.experience, r.introduction
            FROM student_preferences p JOIN users u ON u.id = p.student_id
            LEFT JOIN student_resumes r ON r.student_id = p.student_id
            WHERE p.batch_id = ? AND p.laboratory_id = ? AND p.status = 'SUBMITTED' ORDER BY p.id
            """, (row, index) -> new Applicant(row.getLong("id"), row.getLong("student_id"),
            row.getString("real_name"), row.getString("student_number"),
            row.getBoolean("obey_internal_adjustment"), row.getBoolean("obey_college_adjustment"),
            timestamp(row, "submitted"), row.getString("status"),
            row.getObject("resume_owner") == null ? null : readResume(row)), batch(), labId));
    }

    @Transactional(readOnly = true)
    @GetMapping("/student/workspace")
    Result<Workspace> workspace(HttpServletRequest request) {
        var user = auth.requireStudent(request);
        long batchId = batch();
        var interviews = jdbc.query("""
            SELECT i.id, l.name, u.real_name, UNIX_TIMESTAMP(i.interview_time) AS scheduled, i.interview_status
            FROM interviews i JOIN laboratories l ON l.id = i.laboratory_id
            JOIN users u ON u.id = i.interviewer_id
            WHERE i.batch_id = ? AND i.student_id = ? ORDER BY i.interview_time, i.id
            """, (row, index) -> new Interview(row.getLong("id"), row.getString("name"),
            row.getString("real_name"), timestamp(row, "scheduled"), row.getString("interview_status")), batchId, user.id());
        boolean published = Boolean.TRUE.equals(jdbc.queryForObject("""
            SELECT EXISTS(SELECT 1 FROM publication WHERE batch_id = ? AND status IN ('PUBLISHED', 'ENDED')
                AND start_at <= CURRENT_TIMESTAMP)
            """, Boolean.class, batchId));
        var outcome = published ? jdbc.query("""
            SELECT l.name, u.real_name, f.final_status FROM final_admissions f
            JOIN laboratories l ON l.id = f.laboratory_id LEFT JOIN users u ON u.id = l.leader_id
            WHERE f.batch_id = ? AND f.student_id = ?
            """, (row, index) -> new Outcome(row.getString("name"), row.getString("real_name"),
            row.getString("final_status")), batchId, user.id()).stream().findFirst().orElse(null) : null;
        return Result.ok(new Workspace(window(batchId, false), interviews, offers(batchId, user.id()), published, outcome));
    }

    @Transactional
    @PostMapping(value = "/student/offers/{id}/confirm", consumes = MediaType.APPLICATION_JSON_VALUE)
    Result<List<Offer>> confirm(HttpServletRequest request, @PathVariable long id) {
        var user = auth.requireStudent(request);
        long batchId = batch();
        lockStudent(user.id());
        var offers = offers(batchId, user.id());
        if (offers.stream().anyMatch(offer -> offer.status().equals("CONFIRMED"))) {
            throw error(HttpStatus.CONFLICT, "已确认一个录取去向");
        }
        if (offers.stream().noneMatch(offer -> offer.id() == id && offer.actionable())) {
            throw error(HttpStatus.CONFLICT, "该拟录取不可确认或已超时");
        }
        int changed = jdbc.update("""
            UPDATE admission_intentions SET status = 'CONFIRMED', confirmed_at = CURRENT_TIMESTAMP
            WHERE id = ? AND batch_id = ? AND student_id = ? AND status = 'PENDING'
                AND (confirmation_deadline IS NULL OR CURRENT_TIMESTAMP < confirmation_deadline)
                AND EXISTS (SELECT 1 FROM recruitment_stages s JOIN recruitment_batches b ON b.id = s.batch_id
                    WHERE s.batch_id = ? AND b.status = 'IN_PROGRESS'
                      AND s.stage_number = 5 AND s.stage_status = 'IN_PROGRESS'
                      AND CURRENT_TIMESTAMP >= s.start_time AND CURRENT_TIMESTAMP < s.end_time)
            """, id, batchId, user.id(), batchId);
        if (changed != 1) throw error(HttpStatus.CONFLICT, "该拟录取不可确认或已超时");
        jdbc.update("""
            UPDATE admission_intentions SET status = 'REJECTED'
            WHERE batch_id = ? AND student_id = ? AND id <> ? AND status = 'PENDING' AND admission_type = 'INTENDED'
            """, batchId, user.id(), id);
        audit(user.id(), "CONFIRM_ADMISSION", "ADMISSION_INTENTIONS", id);
        return Result.ok(offers(batchId, user.id()));
    }

    private List<Offer> offers(long batchId, long studentId) {
        return jdbc.query("""
            SELECT a.id, l.name, a.status,
                UNIX_TIMESTAMP(LEAST(COALESCE(a.confirmation_deadline, s.end_time), s.end_time)) AS deadline,
                (b.status = 'IN_PROGRESS' AND s.stage_status = 'IN_PROGRESS' AND CURRENT_TIMESTAMP >= s.start_time
                    AND CURRENT_TIMESTAMP < s.end_time
                    AND (a.confirmation_deadline IS NULL OR CURRENT_TIMESTAMP < a.confirmation_deadline)) AS open,
                (CURRENT_TIMESTAMP >= LEAST(COALESCE(a.confirmation_deadline, s.end_time), s.end_time)
                    OR s.stage_status = 'COMPLETED') AS expired
            FROM admission_intentions a JOIN laboratories l ON l.id = a.laboratory_id
            JOIN recruitment_batches b ON b.id = a.batch_id
            JOIN recruitment_stages s ON s.batch_id = a.batch_id AND s.stage_number = 5
            WHERE a.batch_id = ? AND a.student_id = ? AND a.admission_type = 'INTENDED' ORDER BY a.id
            """, (row, index) -> {
                String status = row.getString("status");
                boolean pending = status.equals("PENDING");
                return new Offer(row.getLong("id"), row.getString("name"),
                    pending && row.getBoolean("expired") ? "EXPIRED" : status,
                    timestamp(row, "deadline"), pending && row.getBoolean("open"));
            }, batchId, studentId);
    }

    private List<Preference> preferences(long batchId, long studentId) {
        return jdbc.query("""
            SELECT p.*, l.name, UNIX_TIMESTAMP(p.submitted_at) AS submitted
            FROM student_preferences p JOIN laboratories l ON l.id = p.laboratory_id
            WHERE p.batch_id = ? AND p.student_id = ? AND p.status = 'SUBMITTED' ORDER BY p.laboratory_id
            """, (row, index) -> new Preference(row.getLong("id"), row.getLong("batch_id"),
            row.getLong("student_id"), row.getLong("laboratory_id"), row.getString("name"),
            row.getBoolean("obey_internal_adjustment"), row.getBoolean("obey_college_adjustment"),
            timestamp(row, "submitted"), row.getString("status")), batchId, studentId);
    }

    private long batch() {
        return jdbc.queryForList("""
            SELECT id FROM recruitment_batches WHERE status IN ('IN_PROGRESS', 'COMPLETED')
            ORDER BY (status = 'IN_PROGRESS') DESC, id DESC LIMIT 1
            """, Long.class).stream().findFirst().orElseThrow(() -> error(HttpStatus.CONFLICT, "暂无选拔批次"));
    }

    private Window window(long batchId, boolean lock) {
        return jdbc.query("""
            SELECT UNIX_TIMESTAMP(s.end_time) AS deadline,
                (b.status = 'IN_PROGRESS' AND s.stage_status = 'IN_PROGRESS'
                    AND CURRENT_TIMESTAMP >= s.start_time AND CURRENT_TIMESTAMP < s.end_time) AS open
            FROM recruitment_stages s JOIN recruitment_batches b ON b.id = s.batch_id
            WHERE s.batch_id = ? AND s.stage_number = 3
            """ + (lock ? " FOR SHARE" : ""),
            (row, index) -> new Window(timestamp(row, "deadline"), row.getBoolean("open")), batchId)
            .stream().findFirst().orElse(new Window(0, false));
    }

    private void audit(long operatorId, String operation, String target, long targetId) {
        jdbc.update("""
            INSERT INTO operation_logs (operator_id, operation_type, target_type, target_id)
            VALUES (?, ?, ?, ?)
            """, operatorId, operation, target, Long.toString(targetId));
    }

    private void lockStudent(long id) {
        if (jdbc.queryForList("""
            SELECT id FROM users WHERE id = ? AND role = 'STUDENT' AND status = 'ACTIVE' FOR UPDATE
            """, Long.class, id).isEmpty()) throw error(HttpStatus.FORBIDDEN, "学生账号不可用");
    }

    private static long timestamp(ResultSet row, String column) throws SQLException {
        return row.getLong(column) * 1000;
    }

    private static ResponseStatusException error(HttpStatus status, String message) {
        return new ResponseStatusException(status, message);
    }
}
