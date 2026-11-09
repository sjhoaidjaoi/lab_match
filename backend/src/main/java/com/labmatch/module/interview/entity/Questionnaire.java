package com.labmatch.module.interview.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;

import java.time.LocalDateTime;

@Data
@TableName("questionnaire")
public class Questionnaire {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long cycleId;

    private Long labId;

    private Long mentorId;

    private Integer round;

    private Integer version;

    private String status;

    private Integer timeLimit;

    private LocalDateTime frozenAt;

    private Long createdBy;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
