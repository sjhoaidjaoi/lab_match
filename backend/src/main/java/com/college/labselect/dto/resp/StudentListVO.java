package com.college.labselect.dto.resp;

import lombok.Data;

/**
 * 学生账号列表项，字段取自 sys_user 学生账号。
 */
@Data
public class StudentListVO {

    private Long id;
    private Long userId;
    private String userNo;
    private String realName;
    private String college;
    private String major;
    private String grade;
    private String phone;
    private String email;
    private Integer status;
    private Integer needChangePwd;
}
