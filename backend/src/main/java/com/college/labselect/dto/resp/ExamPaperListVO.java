package com.college.labselect.dto.resp;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 导师试卷列表项响应。
 */
@Data
public class ExamPaperListVO {

    private Long id;

    private Long roundId;

    private String title;

    private Integer status;

    private String statusText;

    private Integer questionCount;

    private BigDecimal totalScore;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime startTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime endTime;

    private Integer durationMinutes;

    private Long answerCount;

    private Long submittedCount;

    private BigDecimal averageScore;
}
