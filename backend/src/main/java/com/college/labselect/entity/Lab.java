package com.college.labselect.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * 实训室实体，字段与 03_Database.md §3.2 lab 一一对应。
 */
@Data
@TableName("lab")
public class Lab {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    private String labCode;

    private String labName;

    private String introduction;

    private String researchDirection;

    private String equipmentEnv;

    private String trainingPlan;

    private String assessmentRequirement;

    private LocalDate openDayDate;

    private LocalTime openDayStartTime;

    private LocalTime openDayEndTime;

    private String openDayLocation;

    private String openDayNote;

    private Integer totalQuota;

    private Long leaderId;

    private Integer status;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtModified;
}
