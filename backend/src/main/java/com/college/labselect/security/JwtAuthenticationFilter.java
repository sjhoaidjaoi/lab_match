package com.college.labselect.security;

import cn.hutool.core.util.StrUtil;
import com.college.labselect.common.ResponseUtils;
import com.college.labselect.common.ResultCode;
import com.college.labselect.entity.SysUser;
import com.college.labselect.mapper.SysUserMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.Objects;
import java.util.Set;

/**
 * JWT 认证过滤器，负责 Token 解析、黑名单、禁用与首登改密拦截。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";
    private static final String BLACKLIST_KEY_PREFIX = "auth:blacklist:";
    private static final int STATUS_ENABLED = 1;
    private static final int NEED_CHANGE_PASSWORD = 1;
    private static final Set<String> PASSWORD_CHANGE_PATHS =
            Set.of("/api/v1/auth/change-password", "/api/v1/auth/logout");

    private final JwtUtils jwtUtils;
    private final SysUserMapper sysUserMapper;
    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String authorization = request.getHeader("Authorization");
        if (StrUtil.isBlank(authorization) || !authorization.startsWith(BEARER_PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }
        String token = authorization.substring(BEARER_PREFIX.length());
        LoginUser loginUser;
        try {
            loginUser = jwtUtils.getLoginUser(token);
        } catch (Exception exception) {
            log.warn("Token 解析失败：{}", exception.getMessage());
            SecurityContextHolder.clearContext();
            filterChain.doFilter(request, response);
            return;
        }
        if (isBlacklisted(token)) {
            ResponseUtils.writeJson(response, objectMapper, ResultCode.ACCOUNT_DISABLED);
            return;
        }
        SysUser user = sysUserMapper.selectById(loginUser.getUserId());
        if (user == null || !Objects.equals(user.getStatus(), STATUS_ENABLED)) {
            ResponseUtils.writeJson(response, objectMapper, ResultCode.ACCOUNT_DISABLED);
            return;
        }
        if (Objects.equals(user.getNeedChangePwd(), NEED_CHANGE_PASSWORD)
                && !isPasswordChangeAllowed(request)) {
            ResponseUtils.writeJson(response, objectMapper, ResultCode.NEED_CHANGE_PASSWORD);
            return;
        }
        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(loginUser, null, Collections.emptyList());
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentication);
        filterChain.doFilter(request, response);
    }

    /**
     * 判断 Token 是否已进入黑名单，Redis 不可用时按未命中处理以保证可用性。
     *
     * @param token JWT 字符串
     * @return 是否在黑名单
     */
    private boolean isBlacklisted(String token) {
        try {
            String jti = jwtUtils.getJti(token);
            return Boolean.TRUE.equals(stringRedisTemplate.hasKey(BLACKLIST_KEY_PREFIX + jti));
        } catch (Exception exception) {
            log.warn("Token 黑名单校验不可用，按未命中处理：{}", exception.getMessage());
            return false;
        }
    }

    /**
     * 判断首登改密期间当前请求是否放行。
     *
     * @param request HTTP 请求
     * @return 是否放行
     */
    private boolean isPasswordChangeAllowed(HttpServletRequest request) {
        return HttpMethod.POST.matches(request.getMethod())
                && PASSWORD_CHANGE_PATHS.contains(request.getRequestURI());
    }
}
