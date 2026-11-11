package com.college.labselect.dto.resp;

import lombok.Data;

import java.util.List;

/**
 * 待排学生列表项，用于负责人手工拖拽排期。
 */
@Data
public class UnassignedStudentVO {

    private Long studentId;
    private String studentNo;
    private String studentName;
    private List<String> mentorNames;
}
