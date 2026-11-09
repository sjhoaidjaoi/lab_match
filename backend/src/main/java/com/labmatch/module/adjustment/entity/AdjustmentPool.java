package com.labmatch.module.adjustment.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("adjustment_pool")
public class AdjustmentPool {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long cycleId;

    private String scopeCode;

    private String status;

    private LocalDateTime builtAt;
}
