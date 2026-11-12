package com.college.labselect.dto.req;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 录入 / 更新面试评分请求。
 */
@Data
public class InterviewScoreSaveReqDTO {

    @NotNull(message = "轮次 ID 不能为空")
    private Long roundId;

    @NotNull(message = "学生 ID 不能为空")
    private Long studentId;

    @NotNull(message = "学习态度分数不能为空")
    @DecimalMin(value = "0.00", message = "分数必须在 0-100 之间")
    @DecimalMax(value = "100.00", message = "分数必须在 0-100 之间")
    private BigDecimal attitudeScore;

    @NotNull(message = "逻辑思维分数不能为空")
    @DecimalMin(value = "0.00", message = "分数必须在 0-100 之间")
    @DecimalMax(value = "100.00", message = "分数必须在 0-100 之间")
    private BigDecimal logicScore;

    @NotNull(message = "编程基础分数不能为空")
    @DecimalMin(value = "0.00", message = "分数必须在 0-100 之间")
    @DecimalMax(value = "100.00", message = "分数必须在 0-100 之间")
    private BigDecimal programmingScore;

    @NotNull(message = "时间投入分数不能为空")
    @DecimalMin(value = "0.00", message = "分数必须在 0-100 之间")
    @DecimalMax(value = "100.00", message = "分数必须在 0-100 之间")
    private BigDecimal timeScore;

    @DecimalMin(value = "0.00", message = "分数必须在 0-100 之间")
    @DecimalMax(value = "100.00", message = "分数必须在 0-100 之间")
    private BigDecimal manualTotal;

    private String adjustReason;

    @Size(max = 1000, message = "评语不能超过 1000 字")
    private String comment;

    @NotNull(message = "提交标记不能为空")
    @Min(value = 0, message = "提交标记不合法")
    @Max(value = 1, message = "提交标记不合法")
    private Integer submit;
}
