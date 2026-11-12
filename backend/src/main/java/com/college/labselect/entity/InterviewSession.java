package com.college.labselect.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * 面试场次实体，字段与 03_Database.md §3.7 interview_session 一一对应。
 */
@Data
@TableName("interview_session")
public class InterviewSession {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    private Long roundId;

    private Long labId;

    private String sessionName;

    private LocalDate interviewDate;

    private LocalTime startTime;

    private LocalTime endTime;

    private String location;

    private Integer capacity;

    private Integer status;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtModified;
}
