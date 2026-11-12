package com.college.labselect.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 学生档案实体，字段与 03_Database.md §3.19 student_profile 一一对应。
 */
@Data
@TableName("student_profile")
public class StudentProfile {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    private Long userId;

    private String className;

    private BigDecimal gpa;

    private Integer ranking;

    private String englishLevel;

    private String programmingLanguages;

    private String techStack;

    private String projectExperience;

    private String competitionExperience;

    private String researchExperience;

    private String internshipExperience;

    private Integer weeklyHours;

    private String availableSlots;

    private String otherDuties;

    private String expectedDirection;

    private String statement;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtModified;
}
