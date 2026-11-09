package com.labmatch.module.application.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;

import java.time.LocalDateTime;

@Data
@TableName("adjustment_consent")
public class AdjustmentConsent {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long applicationId;

    private String scopeCode;

    private Boolean accepted;

    private LocalDateTime snapshotAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
