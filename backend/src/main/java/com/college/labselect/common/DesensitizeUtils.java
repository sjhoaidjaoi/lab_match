package com.college.labselect.common;

import cn.hutool.core.util.StrUtil;

/**
 * 数据脱敏工具，非本人数据统一走此类。
 */
public final class DesensitizeUtils {

    private DesensitizeUtils() {
    }

    /**
     * 脱敏学号 / 工号，保留前 4 位与后 2 位。
     *
     * @param value 原始值
     * @return 脱敏值
     */
    public static String maskUserNo(String value) {
        if (StrUtil.isBlank(value)) {
            return "";
        }
        if (value.length() <= 4) {
            return "*".repeat(value.length());
        }
        int keepStart = Math.min(4, value.length() - 2);
        return value.substring(0, keepStart) + "****" + value.substring(value.length() - 2);
    }

    /**
     * 脱敏姓名，保留首尾字符。
     *
     * @param value 原始值
     * @return 脱敏值
     */
    public static String maskName(String value) {
        if (StrUtil.isBlank(value)) {
            return "";
        }
        if (value.length() == 1) {
            return "*";
        }
        if (value.length() == 2) {
            return value.charAt(0) + "*";
        }
        return value.charAt(0) + "*" + value.charAt(value.length() - 1);
    }

    /**
     * 脱敏手机号，保留前 3 位与后 4 位。
     *
     * @param value 原始值
     * @return 脱敏值
     */
    public static String maskPhone(String value) {
        if (StrUtil.isBlank(value)) {
            return "";
        }
        if (value.length() < 7) {
            return "*".repeat(value.length());
        }
        return value.substring(0, 3) + "****" + value.substring(value.length() - 4);
    }

    /**
     * 脱敏邮箱，保留域名。
     *
     * @param value 原始值
     * @return 脱敏值
     */
    public static String maskEmail(String value) {
        if (StrUtil.isBlank(value)) {
            return "";
        }
        int atIndex = value.indexOf('@');
        if (atIndex <= 0) {
            return "*".repeat(value.length());
        }
        return value.charAt(0) + "***" + value.substring(atIndex);
    }
}
