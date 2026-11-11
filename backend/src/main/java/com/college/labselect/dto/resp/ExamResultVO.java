package com.college.labselect.dto.resp;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 导师查看的单份答卷结果。
 */
@Data
public class ExamResultVO {

    private Long studentId;

    private String studentNo;

    private String studentName;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime startTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime submitTime;

    private Integer status;

    private String statusText;

    private BigDecimal score;
}
