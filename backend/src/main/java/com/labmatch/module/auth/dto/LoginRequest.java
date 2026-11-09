package com.labmatch.module.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {

    @NotBlank(message = "请输入学号/工号")
    private String loginName;

    @NotBlank(message = "请输入密码")
    private String password;
}
