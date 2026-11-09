package com.labmatch.module.publicity.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("enrollment")
public class Enrollment {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long cycleId;

    private Long studentId;

    private Long labId;

    private Long mentorId;

    private LocalDateTime enrolledAt;
}
