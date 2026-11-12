package com.college.labselect.dto.req;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 个人信息修改请求，仅允许修改手机号与邮箱。
 */
@Data
public class ProfileUpdateReqDTO {

    @Size(max = 20, message = "手机号最长 20 位")
    @Pattern(regexp = "^$|^1[3-9]\\d{9}$", message = "手机号格式不正确")
    private String phone;

    @Size(max = 100, message = "邮箱最长 100 字符")
    @Pattern(regexp = "^$|^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$",
            message = "邮箱格式不正确")
    private String email;
}
