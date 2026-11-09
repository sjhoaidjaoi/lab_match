package com.labmatch.module.audit.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;

import java.time.LocalDateTime;

@Data
@TableName("audit_log")
public class AuditLog {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long actorId;

    private String roleCode;

    private String action;

    private String targetType;

    private Long targetId;

    private String detailJson;

    private String ip;

    private String ua;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
