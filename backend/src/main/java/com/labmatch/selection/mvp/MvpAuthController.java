package com.labmatch.selection.mvp;

import com.labmatch.selection.dto.resp.Result;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/auth")
@Profile("mvp")
class MvpAuthController {
    private static final String SESSION_USER = "mvpUser";
    private final JdbcTemplate jdbc;
    private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder();

    MvpAuthController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    record User(long id, String username, String realName, String studentNumber, String role, String phone) {}
    record Role(String roleCode, String roleName) {}
    record Session(User user, List<Role> roles, String activeRole, String token) {}
    record Credentials(String username, String password) {}
    private record Account(User user, String passwordHash) {}

    @PostMapping("/login")
    Result<Session> login(@RequestBody Credentials input, HttpServletRequest request) {
        if (input.username() == null || input.username().isBlank() || input.username().length() > 64 ||
            input.password() == null || input.password().length() > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "请输入有效的账号和密码");
        }
        var accounts = jdbc.query("""
            SELECT id, username, real_name, student_number, role, phone, password_hash
            FROM users WHERE username = ? AND status = 'ACTIVE'
            """, (row, index) -> new Account(readUser(row), row.getString("password_hash")), input.username().trim());
        if (accounts.isEmpty() || !passwords.matches(input.password(), accounts.get(0).passwordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "账号或密码错误");
        }
        var oldSession = request.getSession(false);
        if (oldSession != null) oldSession.invalidate();
        var user = accounts.get(0).user();
        request.getSession(true).setAttribute(SESSION_USER, user.id());
        return Result.ok(view(user));
    }

    @GetMapping("/me")
    Result<Session> me(HttpServletRequest request) {
        return Result.ok(view(requireUser(request)));
    }

    @PostMapping("/logout")
    Result<Void> logout(HttpServletRequest request) {
        var session = request.getSession(false);
        if (session != null) session.invalidate();
        return Result.ok(null);
    }

    User requireUser(HttpServletRequest request) {
        var session = request.getSession(false);
        if (session == null || !(session.getAttribute(SESSION_USER) instanceof Long userId)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "请先登录");
        }
        return jdbc.query("""
            SELECT id, username, real_name, student_number, role, phone FROM users
            WHERE id = ? AND status = 'ACTIVE'
            """, (row, index) -> readUser(row), userId).stream().findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "账号不可用，请重新登录"));
    }

    User requireStudent(HttpServletRequest request) {
        var user = requireUser(request);
        if (!user.role().equals("STUDENT")) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "仅学生可使用");
        return user;
    }

    private static User readUser(java.sql.ResultSet row) throws java.sql.SQLException {
        return new User(row.getLong("id"), row.getString("username"), row.getString("real_name"),
            row.getString("student_number"), row.getString("role"), row.getString("phone"));
    }

    private static Session view(User user) {
        String label = switch (user.role()) {
            case "STUDENT" -> "学生";
            case "LAB_TEACHER" -> "实训室教师";
            case "LAB_LEADER" -> "实训室组长";
            default -> "学院总负责人";
        };
        // The existing client expects a token-shaped login marker. Authentication uses the session cookie.
        return new Session(user, List.of(new Role(user.role(), label)), user.role(), "session");
    }
}
