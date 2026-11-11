package com.college.labselect.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 在线试卷实体，字段与 03_Database.md §3.22 exam_paper 一一对应。
 */
@Data
@TableName("exam_paper")
public class ExamPaper {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    private Long roundId;

    private Long labId;

    private Long mentorId;

    private String title;

    private String description;

    private LocalDateTime startTime;

    private LocalDateTime endTime;

    private Integer durationMinutes;

    private BigDecimal totalScore;

    private Integer status;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtModified;
}
