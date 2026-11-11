package com.college.labselect.dto.resp;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * 面试排期列表项。
 */
@Data
public class InterviewScheduleVO {

    private Long id;
    private Long roundId;
    private Long labId;
    private String labName;
    private Long mentorId;
    private String mentorName;
    private Long sessionId;
    private String sessionName;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate interviewDate;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime startTime;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime endTime;

    private Long studentId;
    private String studentNo;
    private String studentName;
    private Integer status;
    private String statusText;
}
