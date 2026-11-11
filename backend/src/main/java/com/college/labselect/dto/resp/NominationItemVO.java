package com.college.labselect.dto.resp;

import lombok.Data;

import java.math.BigDecimal;

/**
 * 我的拟录取列表项，字段对齐 01_PRD.md §5.3 拟录取勾选页。
 */
@Data
public class NominationItemVO {

    private Long id;
    private Long studentId;
    private String studentNo;
    private String studentName;
    private BigDecimal totalScore;
    private Integer status;
    private String statusText;
}
