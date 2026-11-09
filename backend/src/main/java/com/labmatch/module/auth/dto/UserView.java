package com.labmatch.module.auth.dto;

import lombok.Data;

@Data
public class UserView {

    private Long id;
    private String loginName;
    private String name;
    private String studentNo;
    private String employeeNo;
    private String phone;
    private String email;
    private Boolean mustChangePassword;
}
