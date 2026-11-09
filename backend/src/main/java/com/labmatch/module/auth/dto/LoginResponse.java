package com.labmatch.module.auth.dto;

import lombok.Data;

import java.util.List;

@Data
public class LoginResponse {

    private String token;
    private UserView user;
    private List<RoleView> roles;
    private String activeRole;
}
