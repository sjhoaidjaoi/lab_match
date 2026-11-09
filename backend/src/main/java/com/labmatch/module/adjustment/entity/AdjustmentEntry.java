package com.labmatch.module.adjustment.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("adjustment_entry")
public class AdjustmentEntry {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long poolId;

    private Long studentId;

    private Long targetMentorId;

    private Long sourceLabId;

    private String status;

    private LocalDateTime assignedAt;

    private Long operatorId;
}
