package com.college.labselect.dto.resp;

import lombok.Data;

import java.math.BigDecimal;

/**
 * 本室评分列表项。
 */
@Data
public class InterviewScoreListVO {

    private Long id;
    private Long studentId;
    private String studentNo;
    private String studentName;
    private Long mentorId;
    private String mentorName;
    private Long sessionId;
    private String sessionName;
    private BigDecimal attitudeScore;
    private BigDecimal logicScore;
    private BigDecimal programmingScore;
    private BigDecimal timeScore;
    private BigDecimal systemTotal;
    private BigDecimal manualTotal;
    private BigDecimal finalTotal;
    private Integer status;
    private String statusText;
}
