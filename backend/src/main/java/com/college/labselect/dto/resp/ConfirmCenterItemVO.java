package com.college.labselect.dto.resp;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 录取待确认项，字段对齐 04_API.md §3.41。
 */
@Data
public class ConfirmCenterItemVO {

    private Long id;
    private Long admissionId;
    private Integer pendingType;
    private String pendingTypeText;
    private Long labId;
    private String labName;
    private Long mentorId;
    private String mentorName;
    private Integer sourceType;
    private String sourceTypeText;
    private BigDecimal totalScore;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime confirmDeadline;

    private Long countdownSeconds;
    private List<String> actions;
}
