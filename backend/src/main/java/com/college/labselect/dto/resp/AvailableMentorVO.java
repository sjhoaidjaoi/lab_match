package com.college.labselect.dto.resp;

import lombok.Data;

/**
 * 可选导师列表项。
 */
@Data
public class AvailableMentorVO {

    private Long mentorId;
    private String mentorName;
    private String title;
    private Long labId;
    private String labName;
    private String researchDirection;
    private Integer quota;
    private Integer quotaUsed;
    private Integer remainQuota;
    private Integer selectable;
}
