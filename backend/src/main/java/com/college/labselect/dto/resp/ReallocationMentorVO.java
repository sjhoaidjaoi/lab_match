package com.college.labselect.dto.resp;

import lombok.Data;

/**
 * 可调剂导师，字段对齐 04_API.md §3.33 availableMentors。
 */
@Data
public class ReallocationMentorVO {

    private Long mentorId;
    private String mentorName;
    private Long labId;
    private String labName;
    private Integer remainQuota;
}
