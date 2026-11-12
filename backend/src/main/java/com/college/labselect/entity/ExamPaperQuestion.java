package com.college.labselect.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 试卷题目实体，字段与 03_Database.md §3.23 exam_paper_question 一一对应。
 */
@Data
@TableName("exam_paper_question")
public class ExamPaperQuestion {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    private Long paperId;

    private Long questionId;

    private Integer questionNo;

    private BigDecimal score;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtModified;
}
