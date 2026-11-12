package com.college.labselect.dto.resp;

import lombok.Data;

/**
 * 登录用户基本信息。
 */
@Data
public class UserInfoVO {

    private Long id;
    private String userNo;
    private String realName;
    private Integer userType;
    private Boolean leader;
    private String college;
    private String major;
    private String grade;
}
