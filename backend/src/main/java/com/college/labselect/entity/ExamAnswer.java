package com.college.labselect.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 在线答卷实体，字段与 03_Database.md §3.24 exam_answer 一一对应。
 */
@Data
@TableName("exam_answer")
public class ExamAnswer {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    private Long paperId;

    private Long roundId;

    private Long mentorId;

    private Long studentId;

    private LocalDateTime startTime;

    private LocalDateTime submitTime;

    private BigDecimal objectiveScore;

    private BigDecimal totalScore;

    private Integer status;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtModified;
}
