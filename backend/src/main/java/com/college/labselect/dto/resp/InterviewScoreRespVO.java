package com.college.labselect.dto.resp;

import lombok.Data;

import java.math.BigDecimal;

/**
 * 录入评分响应。
 */
@Data
public class InterviewScoreRespVO {

    private Long id;
    private BigDecimal systemTotal;
    private BigDecimal manualTotal;
    private BigDecimal finalTotal;
    private Integer status;
}
