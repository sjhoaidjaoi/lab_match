package com.labmatch.module.application.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;

import java.time.LocalDateTime;

@Data
@TableName("intent")
public class Intention {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long applicationId;

    private Long mentorId;

    private Long labId;

    private String status;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
