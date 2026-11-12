package com.college.labselect.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 答卷明细实体，字段与 03_Database.md §3.25 exam_answer_item 一一对应。
 */
@Data
@TableName("exam_answer_item")
public class ExamAnswerItem {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    private Long answerId;

    private Long questionId;

    private String answerContent;

    private Integer isCorrect;

    private BigDecimal score;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtModified;
}
