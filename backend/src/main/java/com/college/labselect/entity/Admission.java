package com.college.labselect.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 录取结果实体，字段与 03_Database.md §3.12 admission 一一对应。
 */
@Data
@TableName("admission")
public class Admission {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    private Long roundId;

    private Long studentId;

    private Long labId;

    private Long mentorId;

    private Integer sourceType;

    private Integer pendingType;

    private Integer activeFlag;

    private Long nominationId;

    private Long waitlistId;

    private Long reallocationId;

    private BigDecimal totalScore;

    private Integer status;

    private LocalDateTime confirmDeadline;

    private LocalDateTime confirmTime;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtModified;
}
