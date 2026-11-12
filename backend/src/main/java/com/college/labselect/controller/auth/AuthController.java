package com.college.labselect.controller.auth;

import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.ChangePasswordReqDTO;
import com.college.labselect.dto.req.LoginReqDTO;
import com.college.labselect.dto.resp.LoginRespVO;
import com.college.labselect.dto.resp.TokenRespVO;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.IAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 认证接口。
 */
@Tag(name = "认证")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final IAuthService authService;

    /**
     * 统一登录。
     *
     * @param req 登录请求
     * @return 登录响应
     */
    @Operation(summary = "统一登录")
    @PostMapping("/login")
    public Result<LoginRespVO> login(@Valid @RequestBody LoginReqDTO req) {
        return Result.success(authService.login(req));
    }

    /**
     * 登出。
     *
     * @param authorization Authorization 请求头
     * @return 统一响应
     */
    @Operation(summary = "登出")
    @PostMapping("/logout")
    public Result<Void> logout(@RequestHeader(value = "Authorization", required = false) String authorization) {
        authService.logout(authorization);
        return Result.success();
    }

    /**
     * 刷新 Token。
     *
     * @param authorization Authorization 请求头
     * @return 新 Token
     */
    @Operation(summary = "刷新 Token")
    @PostMapping("/refresh")
    public Result<TokenRespVO> refresh(@RequestHeader(value = "Authorization", required = false) String authorization) {
        return Result.success(authService.refresh(authorization));
    }

    /**
     * 修改密码。
     *
     * @param loginUser 当前登录用户
     * @param req       修改密码请求
     * @return 统一响应
     */
    @Operation(summary = "修改密码")
    @PostMapping("/change-password")
    public Result<Void> changePassword(@AuthenticationPrincipal LoginUser loginUser,
                                       @Valid @RequestBody ChangePasswordReqDTO req) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        authService.changePassword(loginUser.getUserId(), req);
        return Result.success();
    }
}
