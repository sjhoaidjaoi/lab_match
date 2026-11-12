package com.labmatch.selection.mvp;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("mvp")
@EnabledIfEnvironmentVariable(named = "RUN_STUDENT_MVP_IT", matches = "true")
class StudentMvpIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;

    // Run against a fresh database with the MVP seed and upgrade scripts applied.
    @Test
    void studentPreferencesAreSharedOnlyWithTheAssignedLabAndLeadToAdmission() throws Exception {
        long lab = jdbc.queryForObject("""
            SELECT lt.laboratory_id FROM laboratory_teachers lt JOIN users u ON u.id = lt.teacher_id
            JOIN laboratories l ON l.id = lt.laboratory_id
            WHERE u.username = 'T1001' AND l.name = '软件工程实训室'
            """, Long.class);
        long batch = jdbc.queryForObject("""
            SELECT id FROM recruitment_batches WHERE batch_name = '学生端联调批次'
            """, Long.class);
        long studentId = userId("2022001");
        long teacherId = userId("T1001");
        long otherLab = jdbc.queryForObject("SELECT id FROM laboratories WHERE id <> ? ORDER BY id LIMIT 1", Long.class, lab);

        mvc.perform(get("/api/preferences/my")).andExpect(status().isUnauthorized());
        var student = login("2022001");
        mvc.perform(get("/api/laboratories").session(student))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.length()").value(6));
        mvc.perform(put("/api/student/resume").session(student).contentType("application/json")
            .content("{\"major\":\"计算机科学\",\"skills\":\"Java\"}"))
            .andExpect(status().isOk());
        mvc.perform(get("/api/student/resume").session(login("2022001")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.major").value("计算机科学"));
        mvc.perform(get("/api/student/resume").session(login("2022002")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.major").value(""));
        mvc.perform(get("/api/preferences/lab/" + lab).session(login("T1001")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data").isEmpty());
        submit(student, lab + "," + lab).andExpect(status().isBadRequest());
        submit(student, Long.toString(lab)).andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].laboratoryId").value((int) lab));
        mvc.perform(get("/api/preferences/my").session(login("2022001")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data[0].laboratoryId").value((int) lab));
        mvc.perform(get("/api/preferences/my").session(login("2022002")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data").isEmpty());
        mvc.perform(get("/api/preferences/lab/" + lab).session(login("T1001")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data[0].studentNumber").value("2022001"))
            .andExpect(jsonPath("$.data[0].resume.skills").value("Java"));
        mvc.perform(get("/api/preferences/lab/" + lab).session(login("T1002")).header("X-Role", "COLLEGE_ADMIN"))
            .andExpect(status().isForbidden());

        jdbc.update("UPDATE recruitment_stages SET stage_status = 'COMPLETED' WHERE batch_id = ? AND stage_number = 3", batch);
        submit(student, Long.toString(lab)).andExpect(status().isConflict());
        jdbc.update("""
            UPDATE recruitment_stages SET stage_status = 'IN_PROGRESS',
                start_time = CURRENT_TIMESTAMP, end_time = CURRENT_TIMESTAMP + INTERVAL 1 DAY
            WHERE batch_id = ? AND stage_number = 5
            """, batch);
        jdbc.update("""
            INSERT INTO interviews (batch_id, student_id, laboratory_id, interviewer_id, interview_time)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP + INTERVAL 1 HOUR)
            """, batch, studentId, lab, teacherId);
        jdbc.update("""
            INSERT INTO admission_intentions (batch_id, student_id, laboratory_id, admission_type)
            VALUES (?, ?, ?, 'INTENDED'), (?, ?, ?, 'INTENDED')
            """, batch, studentId, lab, batch, studentId, otherLab);
        long offer = jdbc.queryForObject("""
            SELECT id FROM admission_intentions WHERE student_id = ? AND laboratory_id = ?
            """, Long.class, studentId, lab);
        mvc.perform(get("/api/student/workspace").session(student)).andExpect(status().isOk())
            .andExpect(jsonPath("$.data.interviews.length()").value(1))
            .andExpect(jsonPath("$.data.offers[0].actionable").value(true))
            .andExpect(jsonPath("$.data.published").value(false));
        var otherStudent = login("2022002");
        confirm(otherStudent, offer).andExpect(status().isConflict());
        confirm(student, offer)
            .andExpect(status().isOk()).andExpect(jsonPath("$.data[0].status").value("CONFIRMED"))
            .andExpect(jsonPath("$.data[1].status").value("REJECTED"));
        confirm(student, offer).andExpect(status().isConflict());

        jdbc.update("""
            INSERT INTO final_admissions (batch_id, student_id, laboratory_id, admission_source)
            VALUES (?, ?, ?, 'INTENDED_CONFIRMED')
            """, batch, studentId, lab);
        mvc.perform(get("/api/student/workspace").session(student)).andExpect(status().isOk())
            .andExpect(jsonPath("$.data.outcome").isEmpty());
        jdbc.update("""
            INSERT INTO publication (batch_id, title, start_at, end_at, status)
            VALUES (?, 'MVP test', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL 1 DAY, 'PUBLISHED')
            """, batch);
        mvc.perform(get("/api/student/workspace").session(student)).andExpect(status().isOk())
            .andExpect(jsonPath("$.data.outcome.status").value("ADMITTED"));
        mvc.perform(get("/api/student/workspace").session(otherStudent)).andExpect(status().isOk())
            .andExpect(jsonPath("$.data.outcome").isEmpty());
    }

    private long userId(String username) {
        return jdbc.queryForObject("SELECT id FROM users WHERE username = ?", Long.class, username);
    }

    private MockHttpSession login(String username) throws Exception {
        return (MockHttpSession) mvc.perform(post("/api/auth/login").contentType("application/json")
            .content("{\"username\":\"" + username + "\",\"password\":\"123456\"}"))
            .andExpect(status().isOk()).andReturn().getRequest().getSession(false);
    }

    private org.springframework.test.web.servlet.ResultActions submit(MockHttpSession session, String labs) throws Exception {
        return mvc.perform(post("/api/preferences/submit").session(session).contentType("application/json")
            .content("{\"laboratories\":[" + labs + "],\"obeyInternalAdjustment\":true,\"obeyCollegeAdjustment\":false}"));
    }

    private org.springframework.test.web.servlet.ResultActions confirm(MockHttpSession session, long offer) throws Exception {
        return mvc.perform(post("/api/student/offers/" + offer + "/confirm")
            .session(session).contentType("application/json").content("{}"));
    }
}
