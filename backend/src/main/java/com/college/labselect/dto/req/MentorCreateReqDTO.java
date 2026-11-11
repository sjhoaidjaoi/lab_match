package com.college.labselect.dto.req;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 新增教师账号请求。
 */
@Data
public class MentorCreateReqDTO {

    @NotBlank(message = "工号不能为空")
    private String userNo;

    @NotBlank(message = "姓名不能为空")
    private String realName;

    @NotNull(message = "所属实训室不能为空")
    private Long labId;

    private String title;
    private String researchDirection;
    private String researchProjects;
    private String phone;

    @Email(message = "邮箱格式不正确")
    private String email;

    @NotNull(message = "个人名额不能为空")
    @Min(value = 0, message = "个人名额不能小于 0")
    private Integer quota;

    @Min(value = 0, message = "状态不合法")
    private Integer status;

    /**
     * 是否同时设为该实训室负责人。
     */
    private Boolean leader;
}
