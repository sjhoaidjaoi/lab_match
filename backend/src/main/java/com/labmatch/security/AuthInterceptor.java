package com.labmatch.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labmatch.common.Result;
import com.labmatch.common.ResultCode;
import com.labmatch.module.auth.entity.UserAccount;
import com.labmatch.module.auth.entity.UserRole;
import com.labmatch.module.auth.mapper.UserAccountMapper;
import com.labmatch.module.auth.mapper.UserRoleMapper;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;

/**
 * 统一鉴权拦截器：解析 JWT -> 实时校验账号状态 -> 按 X-Role 解析当前角色 -> 校验 @RequireRole。
 */
@Component
@RequiredArgsConstructor
public class AuthInterceptor implements HandlerInterceptor {

    public static final String HEADER_ROLE = "X-Role";

    private final JwtUtil jwtUtil;
    private final UserAccountMapper userAccountMapper;
    private final UserRoleMapper userRoleMapper;
    private final ObjectMapper objectMapper;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (!(handler instanceof HandlerMethod handlerMethod)) {
            return true;
        }
        String auth = request.getHeader("Authorization");
        if (!StringUtils.hasText(auth) || !auth.startsWith("Bearer ")) {
            return reject(response, HttpServletResponse.SC_UNAUTHORIZED, ResultCode.UNAUTHORIZED, "未登录或登录已过期");
        }
        Long userId;
        try {
            Claims claims = jwtUtil.parse(auth.substring(7));
            userId = Long.valueOf(claims.getSubject());
        } catch (Exception e) {
            return reject(response, HttpServletResponse.SC_UNAUTHORIZED, ResultCode.UNAUTHORIZED, "登录凭证无效，请重新登录");
        }

        UserAccount account = userAccountMapper.selectById(userId);
        if (account == null) {
            return reject(response, HttpServletResponse.SC_UNAUTHORIZED, ResultCode.UNAUTHORIZED, "账号不存在");
        }
        if (!"ENABLED".equals(account.getStatus())) {
            return reject(response, HttpServletResponse.SC_UNAUTHORIZED, ResultCode.UNAUTHORIZED, "账号已被禁用，请联系学院管理员");
        }

        List<UserRole> roles = userRoleMapper.selectActiveByUserId(userId);
        if (roles.isEmpty()) {
            return reject(response, HttpServletResponse.SC_FORBIDDEN, ResultCode.ROLE_FORBIDDEN, "账号未分配角色，请联系学院管理员");
        }
        String requestedRole = request.getHeader(HEADER_ROLE);
        UserRole current = roles.stream()
                .filter(r -> !StringUtils.hasText(requestedRole) || r.getRoleCode().equals(requestedRole))
                .findFirst()
                .orElse(null);
        if (current == null) {
            return reject(response, HttpServletResponse.SC_FORBIDDEN, ResultCode.ROLE_FORBIDDEN, "当前角色无访问权限");
        }

        UserContext.set(new LoginUser(account.getId(), account.getLoginName(), account.getName(),
                current.getRoleCode(), current.getScopeType(), current.getScopeId()));

        RequireRole requireRole = handlerMethod.getMethodAnnotation(RequireRole.class);
        if (requireRole == null) {
            requireRole = handlerMethod.getBeanType().getAnnotation(RequireRole.class);
        }
        if (requireRole != null && Arrays.stream(requireRole.value()).noneMatch(current.getRoleCode()::equals)) {
            return reject(response, HttpServletResponse.SC_FORBIDDEN, ResultCode.ROLE_FORBIDDEN, "当前角色无权访问该功能");
        }
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        UserContext.clear();
    }

    private boolean reject(HttpServletResponse response, int status, String code, String message) throws Exception {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write(objectMapper.writeValueAsString(Result.fail(code, message)));
        return false;
    }
}
