package com.labmatch.selection.controller;
import com.labmatch.selection.dto.resp.Result; import com.labmatch.selection.aspect.WebLog; import jakarta.validation.Valid; import jakarta.validation.constraints.NotBlank; import org.springframework.web.bind.annotation.*; import java.util.*;
@RestController @RequestMapping("/api/auth") public class AuthController {
  public record LoginRequest(@NotBlank String username, @NotBlank String password) {};
  @PostMapping("/login") @WebLog("演示登录") public Result<Map<String,Object>> login(@Valid @RequestBody LoginRequest request) { String role = switch(request.username()) { case "admin" -> "COLLEGE_ADMIN"; case "L001" -> "LAB_LEADER"; case "T1001", "T1002" -> "LAB_TEACHER"; default -> "STUDENT"; }; return Result.ok(Map.of("token", "demo-jwt-token", "activeRole", role, "user", Map.of("username", request.username(), "realName", "演示用户"), "roles", List.of(Map.of("roleCode", role, "roleName", role)))); }
  @GetMapping("/me") public Result<Map<String,Object>> me() { return Result.ok(Map.of("message", "JWT + Redis 黑名单鉴权待接入真实环境")); }
  @PostMapping("/logout") public Result<Void> logout() { return Result.ok(null); }
}
