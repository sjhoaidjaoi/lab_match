package com.labmatch.module.auth.dto;

import lombok.Data;

@Data
public class RoleView {

    private String roleCode;
    private String roleName;
    private String scopeType;
    private Long scopeId;
}
