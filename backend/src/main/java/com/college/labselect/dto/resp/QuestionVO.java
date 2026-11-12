package com.college.labselect.dto.resp;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * 题库题目响应。
 */
@Data
public class QuestionVO {

    private Long id;

    private Integer questionType;

    private String questionTypeText;

    private String content;

    private List<String> options;

    private String correctAnswer;

    private BigDecimal score;

    private Integer status;

    private String statusText;
}
