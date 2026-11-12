package com.college.labselect.dto.resp;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * 实训室详情。
 */
@Data
public class LabDetailVO {

    private Long id;
    private String labCode;
    private String labName;
    private String department;
    private String leaderName;
    private String introduction;
    private String researchDirection;
    private String equipmentEnv;
    private String trainingPlan;
    private String assessmentRequirement;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate openDayDate;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime openDayStartTime;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime openDayEndTime;

    private String openDayLocation;
    private String openDayNote;
    private Integer totalQuota;
    private Integer quotaUsed;
    private Integer remainQuota;
    private Integer status;
    private List<LabMentorVO> mentors;
}
