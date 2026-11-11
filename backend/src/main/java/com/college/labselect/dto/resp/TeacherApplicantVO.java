package com.college.labselect.dto.resp;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 导师报名学生项，字段对齐 04_API.md §3.18。
 */
@Data
public class TeacherApplicantVO {

    private Long studentId;

    private String studentNo;

    private String studentName;

    private String college;

    private String major;

    private String grade;

    private String sessionName;

    private LocalDate interviewDate;

    private BigDecimal totalScore;

    private Integer scoreStatus;

    private String scoreStatusText;

    private Integer admissionStatus;

    private String admissionStatusText;
}
