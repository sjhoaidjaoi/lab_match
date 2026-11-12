package com.college.labselect.dto.resp;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 学生在线笔试列表项。
 */
@Data
public class StudentExamListVO {

    private Long paperId;

    private String title;

    private Long mentorId;

    private String mentorName;

    private String labName;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime startTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime endTime;

    private Integer durationMinutes;

    private BigDecimal totalScore;

    private String paperStatusText;

    private Integer answerStatus;

    private String answerStatusText;

    private BigDecimal myScore;

    private Boolean canStart;
}
