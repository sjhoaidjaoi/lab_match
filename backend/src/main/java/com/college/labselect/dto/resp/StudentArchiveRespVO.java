package com.college.labselect.dto.resp;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * 学生档案详情。
 */
@Data
public class StudentArchiveRespVO {

    private String userNo;
    private String realName;
    private String college;
    private String major;
    private String grade;
    private String className;
    private BigDecimal gpa;
    private Integer ranking;
    private String englishLevel;
    private List<String> programmingLanguages;
    private List<String> techStack;
    private String projectExperience;
    private String competitionExperience;
    private String researchExperience;
    private String internshipExperience;
    private Integer weeklyHours;
    private String availableSlots;
    private String otherDuties;
    private String expectedDirection;
    private String statement;
    private List<String> missingFields;
}
