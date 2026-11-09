package com.labmatch.common;

import lombok.Data;

/**
 * 统一响应体。code 为字符串错误码（见设计文档 15.2），成功时为 OK。
 */
@Data
public class Result<T> {

    private String code;
    private String message;
    private T data;

    public static <T> Result<T> ok(T data) {
        Result<T> r = new Result<>();
        r.setCode(ResultCode.OK);
        r.setMessage("ok");
        r.setData(data);
        return r;
    }

    public static Result<Void> ok() {
        return ok(null);
    }

    public static <T> Result<T> fail(String code, String message) {
        Result<T> r = new Result<>();
        r.setCode(code);
        r.setMessage(message);
        return r;
    }
}
