package com.college.labselect.dto.resp;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 全院录取总览行，管理员视图返回完整学号与姓名。
 */
@Data
public class ResultRowVO {

    private Long admissionId;

    private Long studentId;

    private String studentNo;

    private String studentName;

    private String college;

    private String major;

    private String grade;

    private Long labId;

    private String labName;

    private Long mentorId;

    private String mentorName;

    private BigDecimal totalScore;

    private Integer status;

    private String statusText;

    private Integer sourceType;

    private String sourceTypeText;

    private LocalDateTime confirmTime;
}
