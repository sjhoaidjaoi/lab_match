package com.college.labselect.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 选拔轮次实体，字段与 03_Database.md §3.4 selection_round 一一对应。
 */
@Data
@TableName("selection_round")
public class SelectionRound {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    private Integer roundNo;

    private String roundName;

    private Integer status;

    private LocalDateTime applyStart;

    private LocalDateTime applyEnd;

    private LocalDateTime interviewStart;

    private LocalDateTime interviewEnd;

    private LocalDateTime nominationStart;

    private LocalDateTime nominationSubmitEnd;

    private LocalDateTime confirmStart;

    private LocalDateTime nominationEnd;

    private LocalDateTime adjustStart;

    private LocalDateTime adjustEnd;

    private BigDecimal weightAttitude;

    private BigDecimal weightLogic;

    private BigDecimal weightProgramming;

    private BigDecimal weightTime;

    private Integer locked;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtModified;
}
