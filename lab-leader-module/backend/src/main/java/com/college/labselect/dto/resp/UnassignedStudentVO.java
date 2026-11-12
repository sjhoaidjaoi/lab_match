package com.college.labselect.dto.resp;

import lombok.Data;

/**
 * 待排学生项，按“学生 + 导师”组合返回，用于负责人手工拖拽排期。
 */
@Data
public class UnassignedStudentVO {

    private Long studentId;
    private String studentNo;
    private String studentName;
    private Long mentorId;
    private String mentorName;
}
