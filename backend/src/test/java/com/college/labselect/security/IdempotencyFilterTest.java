package com.college.labselect.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 写接口幂等过滤器单元测试。
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class IdempotencyFilterTest {

    private static final String SUCCESS_BODY = "{\"code\":200,\"message\":\"success\",\"data\":{\"id\":1}}";

    @Mock
    private StringRedisTemplate stringRedisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    private IdempotencyFilter idempotencyFilter;

    @BeforeEach
    void setUp() {
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOperations);
        idempotencyFilter = new IdempotencyFilter(stringRedisTemplate, new ObjectMapper());
        LoginUser loginUser = new LoginUser(1001L, "S2022001", 1);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(loginUser, null, List.of()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    /**
     * 快乐路径：首次请求执行业务并缓存成功响应。
     */
    @Test
    void firstRequest_shouldExecuteAndCacheResult() throws Exception {
        when(valueOperations.get(anyString())).thenReturn(null);
        when(valueOperations.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(true);
        MockHttpServletRequest request = writeRequest("key-1");
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicInteger counter = new AtomicInteger();

        idempotencyFilter.doFilter(request, response, (req, res) -> {
            counter.incrementAndGet();
            res.setContentType("application/json");
            res.getOutputStream().write(SUCCESS_BODY.getBytes(StandardCharsets.UTF_8));
        });

        assertThat(counter.get()).isEqualTo(1);
        assertThat(response.getContentAsString()).isEqualTo(SUCCESS_BODY);
        verify(valueOperations).set(
                startsWith("idem:result:1001:POST:/api/v1/teacher/nominations:key-1"),
                contains("\"code\":200"), eq(Duration.ofHours(24)));
    }

    /**
     * 边界：相同 Idempotency-Key 再次请求直接返回缓存结果。
     */
    @Test
    void repeatedRequest_shouldReturnCachedResultWithoutExecuting() throws Exception {
        when(valueOperations.get(anyString())).thenReturn(SUCCESS_BODY);
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicInteger counter = new AtomicInteger();

        idempotencyFilter.doFilter(writeRequest("key-1"), response, (req, res) -> counter.incrementAndGet());

        assertThat(counter.get()).isZero();
        assertThat(response.getContentAsString()).isEqualTo(SUCCESS_BODY);
    }

    /**
     * 边界：未携带幂等键时按普通请求放行，不访问 Redis。
     */
    @Test
    void missingHeader_shouldPassThrough() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/teacher/nominations");
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicInteger counter = new AtomicInteger();

        idempotencyFilter.doFilter(request, response, (req, res) -> counter.incrementAndGet());

        assertThat(counter.get()).isEqualTo(1);
        verify(stringRedisTemplate, never()).opsForValue();
    }

    /**
     * 边界：并发重复请求且结果未就绪时返回 429001。
     */
    @Test
    void concurrentRequest_shouldReturn429001() throws Exception {
        when(valueOperations.get(anyString())).thenReturn(null);
        when(valueOperations.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(false);
        MockHttpServletResponse response = new MockHttpServletResponse();

        idempotencyFilter.doFilter(writeRequest("key-1"), response, (req, res) -> {
            throw new IllegalStateException("不应执行");
        });

        assertThat(response.getContentAsString()).contains("\"code\":429001");
    }

    private MockHttpServletRequest writeRequest(String idempotencyKey) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/teacher/nominations");
        request.addHeader("Idempotency-Key", idempotencyKey);
        return request;
    }
}
