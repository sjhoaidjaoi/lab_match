package com.college.labselect.dto.req;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * 题库保存请求，字段与 04_API.md 题库接口一致。
 */
@Data
public class QuestionSaveReqDTO {

    @NotNull(message = "题型不能为空")
    @Min(value = 1, message = "题型取值 1-4")
    @Max(value = 4, message = "题型取值 1-4")
    private Integer questionType;

    @NotBlank(message = "题干不能为空")
    @Size(max = 1000, message = "题干最长 1000 字")
    private String content;

    @Size(max = 8, message = "选项最多 8 个")
    private List<String> options;

    @NotBlank(message = "正确答案不能为空")
    @Size(max = 500, message = "正确答案最长 500 字")
    private String correctAnswer;

    @NotNull(message = "分值不能为空")
    @DecimalMin(value = "0.01", message = "分值必须大于 0")
    @DecimalMax(value = "100.00", message = "单题分值不超过 100")
    private BigDecimal score;
}
