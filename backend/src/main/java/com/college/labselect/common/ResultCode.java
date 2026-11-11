package com.college.labselect.common;

import lombok.Getter;

/**
 * 全局错误码，取值严格对齐 04_API.md §1.2。
 */
@Getter
public enum ResultCode {

    SUCCESS(200, "success"),
    PARAM_ERROR(400001, "参数校验失败"),
    BUSINESS_ERROR(400002, "业务规则不满足"),
    QUOTA_EXCEEDED(400003, "超出个人名额上限"),
    OUT_OF_TIME_WINDOW(400004, "不在有效时间窗内"),
    STATUS_NOT_ALLOWED(400005, "当前状态不允许该操作"),
    UNAUTHORIZED(401001, "未登录或 Token 已失效"),
    LOGIN_FAILED(401002, "账号或密码错误"),
    ACCOUNT_DISABLED(401003, "账号已被禁用"),
    NEED_CHANGE_PASSWORD(401004, "需先修改初始密码"),
    FORBIDDEN(403001, "无权访问该资源"),
    NOT_FOUND(404001, "资源不存在"),
    DUPLICATE_SUBMIT(409001, "重复提交或状态冲突"),
    TOO_MANY_REQUESTS(429001, "请求过于频繁"),
    SERVER_ERROR(500001, "服务端异常");

    private final int code;
    private final String message;

    ResultCode(int code, String message) {
        this.code = code;
        this.message = message;
    }
}
