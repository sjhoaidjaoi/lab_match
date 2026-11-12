package com.college.labselect.dto.req;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 新增学生账号请求，字段对齐 03_Database.md §3.1 sys_user。
 */
@Data
public class StudentCreateReqDTO {

    @NotBlank(message = "学号不能为空")
    private String userNo;

    @NotBlank(message = "姓名不能为空")
    private String realName;

    private String college;
    private String major;
    private String grade;
    private String phone;

    @Email(message = "邮箱格式不正确")
    private String email;

    @Min(value = 0, message = "状态不合法")
    @Max(value = 1, message = "状态不合法")
    private Integer status;
}
