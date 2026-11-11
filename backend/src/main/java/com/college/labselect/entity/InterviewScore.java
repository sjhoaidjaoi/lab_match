package com.college.labselect.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 面试评分实体，字段与 03_Database.md §3.9 interview_score 一一对应。
 */
@Data
@TableName("interview_score")
public class InterviewScore {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    private Long roundId;

    private Long labId;

    private Long mentorId;

    private Long studentId;

    private Long sessionId;

    private BigDecimal attitudeScore;

    private BigDecimal logicScore;

    private BigDecimal programmingScore;

    private BigDecimal timeScore;

    private BigDecimal systemTotal;

    private BigDecimal manualTotal;

    private BigDecimal finalTotal;

    private String adjustReason;

    private String comment;

    private Long scorerId;

    private Integer status;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtModified;
}
