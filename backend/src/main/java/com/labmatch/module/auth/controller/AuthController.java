package com.labmatch.module.auth.controller;

import com.labmatch.common.Result;
import com.labmatch.module.auth.dto.ChangePasswordRequest;
import com.labmatch.module.auth.dto.LoginRequest;
import com.labmatch.module.auth.dto.LoginResponse;
import com.labmatch.module.auth.dto.MeResponse;
import com.labmatch.module.auth.dto.SwitchRoleRequest;
import com.labmatch.module.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 统一登录入口（设计文档 11.1）：学生/导师/负责人/管理员共用，角色由数据库预置。
 */
@Tag(name = "认证")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "统一登录")
    @PostMapping("/login")
    public Result<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return Result.ok(authService.login(request));
    }

    @Operation(summary = "当前登录用户信息与角色")
    @GetMapping("/me")
    public Result<MeResponse> me() {
        return Result.ok(authService.me());
    }

    @Operation(summary = "切换当前角色（多角色账号）")
    @PostMapping("/switch-role")
    public Result<LoginResponse> switchRole(@Valid @RequestBody SwitchRoleRequest request) {
        return Result.ok(authService.switchRole(request.getRoleCode()));
    }

    @Operation(summary = "修改密码（首次登录强制）")
    @PostMapping("/change-password")
    public Result<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(request);
        return Result.ok();
    }

    @Operation(summary = "退出登录")
    @PostMapping("/logout")
    public Result<Void> logout() {
        // JWT 无状态：前端清除 token 即退出。
        // 如需服务端强制失效（BR-AUTH-05 的登出即失效），后续接入 Redis 黑名单。
        return Result.ok();
    }
}
