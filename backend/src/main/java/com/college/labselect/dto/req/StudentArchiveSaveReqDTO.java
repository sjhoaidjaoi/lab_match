package com.college.labselect.dto.req;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * 保存学生档案请求，保存时不强制必填齐全。
 */
@Data
public class StudentArchiveSaveReqDTO {

    private String className;

    @DecimalMin(value = "0.00", message = "绩点不能小于 0")
    @DecimalMax(value = "5.00", message = "绩点不能大于 5")
    private BigDecimal gpa;

    @Min(value = 1, message = "专业排名必须大于 0")
    private Integer ranking;

    private String englishLevel;

    private List<String> programmingLanguages;

    private List<String> techStack;

    private String projectExperience;
    private String competitionExperience;
    private String researchExperience;
    private String internshipExperience;

    @Min(value = 1, message = "每周可投入小时需在 1-40 之间")
    @Max(value = 40, message = "每周可投入小时需在 1-40 之间")
    private Integer weeklyHours;

    private String availableSlots;
    private String otherDuties;
    private String expectedDirection;

    @Size(max = 2000, message = "个人陈述不能超过 2000 字")
    private String statement;
}
