package com.college.labselect.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 面试场次面试官实体，字段与 03_Database.md §3.7.1 interview_session_interviewer 一一对应。
 */
@Data
@TableName("interview_session_interviewer")
public class InterviewSessionInterviewer {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    private Long sessionId;

    private Long interviewerId;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtModified;
}
