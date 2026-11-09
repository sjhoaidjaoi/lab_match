package com.labmatch.module.auth.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("user_role")
public class UserRole {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    /** STUDENT / MENTOR / LAB_HEAD / COLLEGE_ADMIN / SYS_ADMIN */
    private String roleCode;

    /** SELF / LAB / COLLEGE / ALL */
    private String scopeType;

    private Long scopeId;
    private Boolean active;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
