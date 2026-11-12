package com.college.labselect.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 题库实体，字段与 03_Database.md §3.21 question 一一对应。
 */
@Data
@TableName("question")
public class Question {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    private Long mentorId;

    private Long labId;

    private Integer questionType;

    private String content;

    private String optionsJson;

    private String correctAnswer;

    private BigDecimal score;

    private Integer status;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtModified;
}
