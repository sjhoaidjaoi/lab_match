package com.college.labselect.dto.resp;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * 学生视角题目，不包含正确答案。
 */
@Data
public class StudentExamQuestionVO {

    private Long questionId;

    private Integer questionNo;

    private Integer questionType;

    private String questionTypeText;

    private String content;

    private List<String> options;

    private BigDecimal score;

    private String answerContent;
}
