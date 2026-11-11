package com.college.labselect.dto.resp;

import lombok.Data;

/**
 * 个人信息响应，对齐 01_PRD.md 个人中心页面字段。
 */
@Data
public class ProfileRespVO {

    private Long id;

    private String userNo;

    private String realName;

    private Integer userType;

    private Integer gender;

    private String phone;

    private String email;

    private String college;

    private String major;

    private String grade;

    private String title;
}
