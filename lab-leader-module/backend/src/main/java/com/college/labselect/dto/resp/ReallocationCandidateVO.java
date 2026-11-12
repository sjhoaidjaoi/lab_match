package com.college.labselect.dto.resp;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * 调剂候选学生，字段对齐 04_API.md §3.33 / §2.5 本室调剂候选。
 */
@Data
public class ReallocationCandidateVO {

    private Long studentId;
    private String studentNo;
    private String studentName;
    private Long originLabId;
    private String originLabName;
    private Integer acceptInnerAdjust;
    private Integer acceptCrossAdjust;
    private BigDecimal totalScore;
    private List<ReallocationMentorVO> availableMentors;
}
