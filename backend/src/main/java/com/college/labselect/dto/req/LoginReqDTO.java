package com.college.labselect.dto.req;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 登录请求。
 */
@Data
public class LoginReqDTO {

    @NotNull(message = "登录端类型不能为空")
    @Min(value = 1, message = "登录端类型不合法")
    @Max(value = 3, message = "登录端类型不合法")
    private Integer loginType;

    @NotBlank(message = "学号/工号不能为空")
    private String userNo;

    @NotBlank(message = "密码不能为空")
    private String password;
}
