package com.college.labselect.dto.resp;

import lombok.Data;

import java.math.BigDecimal;

/**
 * 负责人调整拟录取名单时的候选学生。
 */
@Data
public class LeaderNominationCandidateVO {

    private Long studentId;
    private String studentNo;
    private String studentName;
    private BigDecimal totalScore;
    private Boolean nominated;
}
