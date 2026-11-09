package com.labmatch.module.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SwitchRoleRequest {

    @NotBlank(message = "请选择角色")
    private String roleCode;
}
