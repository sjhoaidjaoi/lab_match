package com.college.labselect.dto.req;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 试卷题目请求，指定题库题目与试卷内分值。
 */
@Data
public class ExamPaperQuestionReqDTO {

    @NotNull(message = "题目不能为空")
    private Long questionId;

    @NotNull(message = "分值不能为空")
    @DecimalMin(value = "0.01", message = "分值必须大于 0")
    @DecimalMax(value = "100.00", message = "单题分值不超过 100")
    private BigDecimal score;
}
