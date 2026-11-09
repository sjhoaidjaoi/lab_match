package com.labmatch.module.base.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;

import java.time.LocalDateTime;

@Data
@TableName("round")
public class Round {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long cycleId;

    private Integer roundNo;

    private String status;

    private LocalDateTime applyStart;

    private LocalDateTime applyEnd;

    private LocalDateTime interviewStart;

    private LocalDateTime interviewEnd;

    private LocalDateTime confirmStart;

    private LocalDateTime confirmEnd;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
