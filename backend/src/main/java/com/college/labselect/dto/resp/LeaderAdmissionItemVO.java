package com.college.labselect.dto.resp;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 本室录取名单项，供负责人查看确认情况与最终名单。
 */
@Data
public class LeaderAdmissionItemVO {

    private Long id;
    private Long studentId;
    private String studentNo;
    private String studentName;
    private Long mentorId;
    private String mentorName;
    private BigDecimal totalScore;
    private Integer status;
    private String statusText;
    private Integer sourceType;
    private String sourceTypeText;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime confirmTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime confirmDeadline;
}
