package com.college.labselect.dto.resp;

import lombok.Data;

import java.util.List;

/**
 * 全院调剂池学生卡片，字段对齐 04_API.md §3.43。
 */
@Data
public class ReallocationPoolItemVO {

    private Long studentId;
    private String studentNo;
    private String studentName;
    private String college;
    private String major;
    private String grade;
    private String statementSummary;
    private Integer hasFullArchive;
    private List<String> programmingLanguages;
    private Integer weeklyHours;
    private Integer taken;
    private String takenLabName;
}
