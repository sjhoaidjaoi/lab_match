package com.college.labselect.common;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 统一响应体。
 *
 * @param <T> 业务数据类型
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Result<T> {

    private Integer code;
    private String message;
    private T data;

    /**
     * 成功响应，无业务数据。
     *
     * @param <T> 业务数据类型
     * @return 统一响应
     */
    public static <T> Result<T> success() {
        return new Result<>(ResultCode.SUCCESS.getCode(), ResultCode.SUCCESS.getMessage(), null);
    }

    /**
     * 成功响应，携带业务数据。
     *
     * @param data 业务数据
     * @param <T>  业务数据类型
     * @return 统一响应
     */
    public static <T> Result<T> success(T data) {
        return new Result<>(ResultCode.SUCCESS.getCode(), ResultCode.SUCCESS.getMessage(), data);
    }

    /**
     * 失败响应，使用预定义错误码。
     *
     * @param resultCode 错误码
     * @param <T>        业务数据类型
     * @return 统一响应
     */
    public static <T> Result<T> error(ResultCode resultCode) {
        return new Result<>(resultCode.getCode(), resultCode.getMessage(), null);
    }

    /**
     * 失败响应，使用预定义错误码并覆盖提示文案。
     *
     * @param resultCode 错误码
     * @param message    提示文案
     * @param <T>        业务数据类型
     * @return 统一响应
     */
    public static <T> Result<T> error(ResultCode resultCode, String message) {
        return new Result<>(resultCode.getCode(), message, null);
    }

    /**
     * 失败响应，使用自定义错误码与提示文案。
     *
     * @param code    错误码
     * @param message 提示文案
     * @param <T>     业务数据类型
     * @return 统一响应
     */
    public static <T> Result<T> error(int code, String message) {
        return new Result<>(code, message, null);
    }
}
