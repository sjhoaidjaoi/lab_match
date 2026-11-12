package com.college.labselect.dto.resp;

import lombok.Data;

import java.math.BigDecimal;

/**
 * 导师查看评分详情。
 */
@Data
public class TeacherScoreDetailVO {

    private Long id;
    private Long studentId;
    private Long mentorId;
    private String mentorName;
    private String studentNo;
    private String studentName;
    private BigDecimal attitudeScore;
    private BigDecimal logicScore;
    private BigDecimal programmingScore;
    private BigDecimal timeScore;
    private BigDecimal systemTotal;
    private BigDecimal manualTotal;
    private BigDecimal finalTotal;
    private String adjustReason;
    private String comment;
    private Integer status;
}
