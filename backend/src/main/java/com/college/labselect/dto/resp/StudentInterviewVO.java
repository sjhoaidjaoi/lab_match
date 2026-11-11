package com.college.labselect.dto.resp;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * 学生面试安排。
 */
@Data
public class StudentInterviewVO {

    private Long id;
    private Integer roundNo;
    private Long labId;
    private String labName;
    private Long mentorId;
    private String mentorName;
    private String sessionName;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate interviewDate;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime startTime;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime endTime;

    private String location;
    private List<String> interviewers;
    private String note;
    private Integer status;
    private String statusText;
}
