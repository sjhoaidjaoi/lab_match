package com.college.labselect.dto.resp;

import lombok.Data;

/**
 * 实训室下的导师简要信息。
 */
@Data
public class LabMentorVO {

    private Long id;
    private Long userId;
    private Long labId;
    private String labName;
    private String realName;
    private String title;
    private String researchDirection;
    private String researchProjects;
    private Integer quota;
    private Integer quotaUsed;
    private Integer remainQuota;
}
