package com.college.labselect.security;

import cn.hutool.core.util.StrUtil;
import com.college.labselect.common.ResponseUtils;
import com.college.labselect.common.ResultCode;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Set;

/**
 * 写接口幂等过滤器，按 Idempotency-Key 缓存成功响应 24 小时。
 */
@Slf4j
@Component
@Order(Ordered.LOWEST_PRECEDENCE)
@RequiredArgsConstructor
public class IdempotencyFilter extends OncePerRequestFilter {

    private static final String IDEMPOTENCY_HEADER = "Idempotency-Key";
    private static final String RESULT_KEY_PREFIX = "idem:result:";
    private static final String LOCK_KEY_PREFIX = "idem:lock:";
    private static final Set<String> WRITE_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");
    private static final Duration RESULT_TTL = Duration.ofHours(24);
    private static final Duration LOCK_TTL = Duration.ofSeconds(30);

    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String idempotencyKey = request.getHeader(IDEMPOTENCY_HEADER);
        Long userId = currentUserId();
        if (!WRITE_METHODS.contains(request.getMethod())
                || !request.getRequestURI().startsWith("/api/v1/")
                || StrUtil.isBlank(idempotencyKey)
                || userId == null) {
            filterChain.doFilter(request, response);
            return;
        }
        String baseKey = userId + ":" + request.getMethod() + ":" + request.getRequestURI()
                + ":" + idempotencyKey.trim();
        String resultKey = RESULT_KEY_PREFIX + baseKey;
        String lockKey = LOCK_KEY_PREFIX + baseKey;

        String cached = getResult(resultKey);
        if (cached != null) {
            writeCached(response, cached);
            return;
        }
        Boolean locked;
        try {
            locked = stringRedisTemplate.opsForValue().setIfAbsent(lockKey, "1", LOCK_TTL);
        } catch (Exception exception) {
            log.warn("幂等锁不可用，按非幂等请求处理：{}", exception.getMessage());
            filterChain.doFilter(request, response);
            return;
        }
        if (!Boolean.TRUE.equals(locked)) {
            cached = getResult(resultKey);
            if (cached != null) {
                writeCached(response, cached);
                return;
            }
            ResponseUtils.writeJson(response, objectMapper, ResultCode.TOO_MANY_REQUESTS);
            return;
        }

        ContentCachingResponseWrapper wrapper = new ContentCachingResponseWrapper(response);
        try {
            filterChain.doFilter(request, wrapper);
            cacheSuccessResult(resultKey, wrapper);
        } finally {
            try {
                stringRedisTemplate.delete(lockKey);
            } catch (Exception exception) {
                log.warn("幂等锁释放失败：{}", exception.getMessage());
            }
            wrapper.copyBodyToResponse();
        }
    }

    /**
     * 读取当前登录用户 ID。
     *
     * @return 用户 ID，未登录返回 null
     */
    private Long currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof LoginUser loginUser)) {
            return null;
        }
        return loginUser.getUserId();
    }

    /**
     * 读取已缓存的成功响应。
     *
     * @param resultKey 缓存键
     * @return 响应 JSON，未命中返回 null
     */
    private String getResult(String resultKey) {
        try {
            return stringRedisTemplate.opsForValue().get(resultKey);
        } catch (Exception exception) {
            log.warn("幂等结果读取失败：{}", exception.getMessage());
            return null;
        }
    }

    /**
     * 缓存业务成功的 JSON 响应。
     *
     * @param resultKey 缓存键
     * @param wrapper   响应包装器
     */
    private void cacheSuccessResult(String resultKey, ContentCachingResponseWrapper wrapper) {
        byte[] body = wrapper.getContentAsByteArray();
        if (body.length == 0 || wrapper.getStatus() < 200 || wrapper.getStatus() >= 300) {
            return;
        }
        String contentType = wrapper.getContentType();
        if (contentType == null || !contentType.contains(MediaType.APPLICATION_JSON_VALUE)) {
            return;
        }
        try {
            JsonNode root = objectMapper.readTree(body);
            if (root.path("code").asInt(0) != ResultCode.SUCCESS.getCode()) {
                return;
            }
            stringRedisTemplate.opsForValue()
                    .set(resultKey, new String(body, StandardCharsets.UTF_8), RESULT_TTL);
        } catch (Exception exception) {
            log.warn("幂等结果写入失败：{}", exception.getMessage());
        }
    }

    /**
     * 写出缓存响应。
     *
     * @param response HTTP 响应
     * @param cached   缓存 JSON
     * @throws IOException 写出异常
     */
    private void writeCached(HttpServletResponse response, String cached) throws IOException {
        byte[] bytes = cached.getBytes(StandardCharsets.UTF_8);
        response.setStatus(HttpServletResponse.SC_OK);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentLength(bytes.length);
        response.getOutputStream().write(bytes);
        response.flushBuffer();
    }
}
