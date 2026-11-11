package com.college.labselect.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 用户账号实体，字段与 03_Database.md §3.1 sys_user 一一对应。
 */
@Data
@TableName("sys_user")
public class SysUser {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    private String userNo;

    private String password;

    private String realName;

    private Integer userType;

    private Integer gender;

    private String phone;

    private String email;

    private String college;

    private String major;

    private String grade;

    private String title;

    private Integer status;

    private Integer needChangePwd;

    private LocalDateTime lastLoginAt;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtModified;
}
