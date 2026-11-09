package com.labmatch.security;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 当前请求的登录用户（由拦截器根据数据库实时权限构建，不信任前端声明）。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginUser {

    private Long userId;
    private String loginName;
    private String name;
    private String roleCode;
    private String scopeType;
    private Long scopeId;
}
