package com.labmatch.module.base.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("lab_quota_snapshot")
public class LabQuotaSnapshot {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long cycleId;

    private Long labId;

    private Long mentorId;

    private Integer quota;

    private LocalDateTime snapshotAt;
}
