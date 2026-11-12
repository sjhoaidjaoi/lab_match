package com.college.labselect.dto.req;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 编辑学生账号请求，学号创建后不可修改。
 */
@Data
public class StudentUpdateReqDTO {

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
