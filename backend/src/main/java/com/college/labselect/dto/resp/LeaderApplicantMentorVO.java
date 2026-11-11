package com.college.labselect.dto.resp;

import lombok.Data;

/**
 * 本室报名学生的意向导师项。
 */
@Data
public class LeaderApplicantMentorVO {

    private Long mentorId;
    private String mentorName;
    private Long labId;
    private String labName;
}
