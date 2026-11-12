package com.college.labselect.dto.resp;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * 导师查看学生档案，字段对齐 04_API.md §3.40，学号姓名脱敏且不含缺失项。
 */
@Data
public class TeacherStudentArchiveVO {

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
}
