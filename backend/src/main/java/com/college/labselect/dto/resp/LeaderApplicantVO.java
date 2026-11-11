package com.college.labselect.dto.resp;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * 本室报名学生项，供负责人查看全量报名与志愿情况。
 */
@Data
public class LeaderApplicantVO {

    private Long studentId;
    private String studentNo;
    private String studentName;
    private String college;
    private String major;
    private String grade;
    private List<LeaderApplicantMentorVO> intentions;
    private Integer acceptInnerAdjust;
    private Integer acceptCrossAdjust;
    private String sessionName;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate interviewDate;

    private Integer scheduleStatus;
    private String scheduleStatusText;
    private BigDecimal totalScore;
    private Integer scoreStatus;
    private String scoreStatusText;
    private Integer admissionStatus;
    private String admissionStatusText;
}
