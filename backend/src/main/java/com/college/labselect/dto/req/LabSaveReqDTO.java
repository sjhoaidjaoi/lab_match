package com.college.labselect.dto.req;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * 新建 / 修改实训室请求。
 */
@Data
public class LabSaveReqDTO {

    @NotBlank(message = "实训室编码不能为空")
    private String labCode;

    @NotBlank(message = "实训室名称不能为空")
    private String labName;

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

    @NotNull(message = "总名额不能为空")
    @Min(value = 0, message = "总名额不能小于 0")
    private Integer totalQuota;

    @Min(value = 0, message = "状态不合法")
    private Integer status;
}
