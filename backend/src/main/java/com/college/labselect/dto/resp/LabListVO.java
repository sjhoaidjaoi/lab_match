package com.college.labselect.dto.resp;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDate;

/**
 * 实训室列表项。
 */
@Data
public class LabListVO {

    private Long id;
    private String labCode;
    private String labName;
    private String leaderName;
    private Integer mentorCount;
    private Integer totalQuota;
    private Integer quotaUsed;
    private Integer remainQuota;
    private String researchDirection;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate openDayDate;

    private Integer status;
}
