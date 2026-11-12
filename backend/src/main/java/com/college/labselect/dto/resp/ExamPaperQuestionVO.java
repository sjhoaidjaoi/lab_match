package com.college.labselect.dto.resp;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * 试卷题目响应（导师视角，含正确答案）。
 */
@Data
public class ExamPaperQuestionVO {

    private Long id;

    private Long questionId;

    private Integer questionNo;

    private Integer questionType;

    private String questionTypeText;

    private String content;

    private List<String> options;

    private String correctAnswer;

    private BigDecimal score;
}
