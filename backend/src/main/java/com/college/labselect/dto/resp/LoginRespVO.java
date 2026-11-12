package com.college.labselect.dto.resp;

import lombok.Data;

/**
 * 登录响应。
 */
@Data
public class LoginRespVO {

    private String token;
    private Long expiresIn;
    private Integer needChangePwd;
    private UserInfoVO user;
}
