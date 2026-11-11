package com.college.labselect.common;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * HTTP 统一响应写出工具。
 */
public final class ResponseUtils {

    private ResponseUtils() {
    }

    /**
     * 以统一响应格式写出指定错误码。
     *
     * @param response     HTTP 响应
     * @param objectMapper JSON 序列化器
     * @param resultCode   错误码
     * @throws IOException 写出异常
     */
    public static void writeJson(HttpServletResponse response, ObjectMapper objectMapper,
                                 ResultCode resultCode) throws IOException {
        response.setStatus(HttpServletResponse.SC_OK);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        objectMapper.writeValue(response.getWriter(), Result.error(resultCode));
    }
}
