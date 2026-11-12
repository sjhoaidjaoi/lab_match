package com.college.labselect.dto.resp;

import lombok.Data;

import java.math.BigDecimal;

/**
 * 递补名单项，字段对齐 04_API.md §3.21。
 */
@Data
public class WaitlistItemVO {

    private Long id;
    private Integer rankNo;
    private Long studentId;
    private String studentNo;
    private String studentName;
    private BigDecimal totalScore;
    private Integer isManual;
    private String adjustReason;
    private Integer applyStatus;
    private String applyStatusText;
}
