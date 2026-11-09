package com.labmatch.module.offer.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;

import java.time.LocalDateTime;

@Data
@TableName("offer")
public class Offer {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long cycleId;

    private Integer round;

    private Long mentorId;

    private Long studentId;

    private String status;

    private LocalDateTime issuedAt;

    private LocalDateTime expireAt;

    private LocalDateTime confirmedAt;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
