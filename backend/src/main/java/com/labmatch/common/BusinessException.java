package com.labmatch.common;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * 业务异常：由全局异常处理器统一转换为 Result。
 */
@Getter
public class BusinessException extends RuntimeException {

    private final String code;
    private final HttpStatus httpStatus;

    public BusinessException(String code, String message) {
        this(code, message, HttpStatus.BAD_REQUEST);
    }

    public BusinessException(String code, String message, HttpStatus httpStatus) {
        super(message);
        this.code = code;
        this.httpStatus = httpStatus;
    }

    public static BusinessException notImplemented(String feature) {
        return new BusinessException(ResultCode.NOT_IMPLEMENTED, feature + "：待实现", HttpStatus.NOT_IMPLEMENTED);
    }
}
