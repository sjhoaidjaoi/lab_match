package com.college.labselect.dto.resp;

import lombok.Data;

import java.math.BigDecimal;

/**
 * 本室递补名单项，供负责人查看并调整顺位。
 */
@Data
public class LeaderWaitlistItemVO {

    private Long id;
    private Long roundId;
    private Long mentorId;
    private String mentorName;
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
