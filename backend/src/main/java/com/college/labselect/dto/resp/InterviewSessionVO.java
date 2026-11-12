package com.college.labselect.dto.resp;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * 面试场次列表项。
 */
@Data
public class InterviewSessionVO {

    private Long id;
    private Long roundId;
    private String sessionName;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate interviewDate;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime startTime;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime endTime;

    private String location;
    private Integer capacity;
    private Integer scheduledCount;
    private Integer status;
    private String statusText;
    private List<Long> interviewerIds;
    private List<String> interviewerNames;
}
