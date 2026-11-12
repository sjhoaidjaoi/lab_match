package com.college.labselect.dto.resp;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 管理员公示名单行，响应结构对齐 04_API.md §3.35.1。
 */
@Data
public class PublicityAdminRowVO {

    private Long admissionId;
    private Long studentId;
    private String studentNo;
    private String studentName;
    private String college;
    private String major;
    private Long labId;
    private String labName;
    private Long mentorId;
    private String mentorName;
    private BigDecimal finalTotal;
    private Integer status;
    private String statusText;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime confirmTime;
}
