package com.labmatch.module.interview.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;

import java.time.LocalDateTime;

@Data
@TableName("mentor_list")
public class MentorList {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long cycleId;

    private Long mentorId;

    private Integer round;

    private String type;

    private Long studentId;

    private Integer rankNo;

    private String reason;

    private String status;

    private LocalDateTime submittedAt;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
