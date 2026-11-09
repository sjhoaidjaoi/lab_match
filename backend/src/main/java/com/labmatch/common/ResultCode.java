package com.labmatch.common;

/**
 * 业务错误码，与设计文档 15.2 保持一致。
 */
public final class ResultCode {

    public static final String OK = "OK";

    public static final String UNAUTHORIZED = "UNAUTHORIZED";
    public static final String ROLE_FORBIDDEN = "ROLE_FORBIDDEN";
    public static final String SCOPE_FORBIDDEN = "SCOPE_FORBIDDEN";
    public static final String WINDOW_CLOSED = "WINDOW_CLOSED";
    public static final String WINDOW_NOT_OPEN = "WINDOW_NOT_OPEN";
    public static final String ALREADY_CONFIRMED = "ALREADY_CONFIRMED";
    public static final String QUOTA_EXCEEDED = "QUOTA_EXCEEDED";
    public static final String VALIDATION_FAILED = "VALIDATION_FAILED";
    public static final String CONFLICT = "CONFLICT";
    public static final String STAGE_LOCKED = "STAGE_LOCKED";
    public static final String RATE_LIMITED = "RATE_LIMITED";
    public static final String NOT_FOUND = "NOT_FOUND";
    public static final String NOT_IMPLEMENTED = "NOT_IMPLEMENTED";
    public static final String INTERNAL_ERROR = "INTERNAL_ERROR";

    private ResultCode() {
    }
}
