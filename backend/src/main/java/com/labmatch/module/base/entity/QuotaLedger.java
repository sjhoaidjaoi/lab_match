package com.labmatch.module.base.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;

import java.time.LocalDateTime;

@Data
@TableName("quota_ledger")
public class QuotaLedger {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long cycleId;

    private Long mentorId;

    private String entryType;

    private Integer qty;

    private String refType;

    private Long refId;

    private String note;

    private Long operatorId;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
