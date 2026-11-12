package com.college.labselect.dto.resp;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 导师试卷详情响应，含正确答案例用于复核。
 */
@Data
public class ExamPaperDetailVO {

    private Long id;

    private Long roundId;

    private String title;

    private String description;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime startTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime endTime;

    private Integer durationMinutes;

    private BigDecimal totalScore;

    private Integer status;

    private String statusText;

    private Integer questionCount;

    private List<ExamPaperQuestionVO> questions;
}
