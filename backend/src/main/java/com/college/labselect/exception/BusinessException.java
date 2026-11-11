package com.college.labselect.exception;

import com.college.labselect.common.ResultCode;
import lombok.Getter;

/**
 * 业务异常，由全局异常处理器统一转换为统一响应。
 */
@Getter
public class BusinessException extends RuntimeException {

    private final int code;

    /**
     * 使用预定义错误码构造异常。
     *
     * @param resultCode 错误码
     */
    public BusinessException(ResultCode resultCode) {
        super(resultCode.getMessage());
        this.code = resultCode.getCode();
    }

    /**
     * 使用预定义错误码并覆盖提示文案构造异常。
     *
     * @param resultCode 错误码
     * @param message    提示文案
     */
    public BusinessException(ResultCode resultCode, String message) {
        super(message);
        this.code = resultCode.getCode();
    }

    /**
     * 使用自定义错误码构造异常。
     *
     * @param code    错误码
     * @param message 提示文案
     */
    public BusinessException(int code, String message) {
        super(message);
        this.code = code;
    }
}
