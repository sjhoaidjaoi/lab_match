package com.college.labselect.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 拟录取实体，字段与 03_Database.md §3.10 nomination 一一对应。
 */
@Data
@TableName("nomination")
public class Nomination {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    private Long roundId;

    private Long labId;

    private Long mentorId;

    private Long studentId;

    private Long scoreId;

    private BigDecimal totalScore;

    private Integer status;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtModified;
}
