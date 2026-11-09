package com.labmatch.module.base.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;

import java.time.LocalDateTime;

@Data
@TableName("cycle")
public class Cycle {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String name;

    private Integer cycleYear;

    private String status;

    private Integer currentRound;

    private LocalDateTime announceAt;

    private LocalDateTime openDayStart;

    private LocalDateTime openDayEnd;

    private LocalDateTime adjustStart;

    private LocalDateTime adjustEnd;

    private LocalDateTime publicityStart;

    private LocalDateTime publicityEnd;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
