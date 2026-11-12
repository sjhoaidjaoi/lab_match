package com.college.labselect.dto.resp;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 学生答题页详情，不包含正确答案。
 */
@Data
public class StudentExamDetailVO {

    private Long paperId;

    private String title;

    private String description;

    private String mentorName;

    private String labName;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime startTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime endTime;

    private Integer durationMinutes;

    private BigDecimal totalScore;

    private Integer answerStatus;

    private String answerStatusText;

    private Long remainingSeconds;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime submittedTime;

    private BigDecimal myScore;

    private List<StudentExamQuestionVO> questions;
}
