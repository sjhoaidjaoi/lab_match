package com.college.labselect.dto.resp;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 交卷与自动判分结果。
 */
@Data
public class ExamSubmitRespVO {

    private Long answerId;

    private BigDecimal objectiveScore;

    private BigDecimal totalScore;

    private BigDecimal totalScoreOfPaper;

    private Integer correctCount;

    private Integer questionCount;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime submitTime;
}
