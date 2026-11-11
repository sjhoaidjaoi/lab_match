package com.college.labselect.dto.resp;

import lombok.Data;

/**
 * 导师与名额列表项。
 */
@Data
public class MentorListVO {

    private Long id;
    private Long userId;
    private String userNo;
    private String realName;
    private Long labId;
    private String labName;
    private String title;
    private String researchDirection;
    private Integer quota;
    private Integer quotaUsed;
    private Integer remainQuota;
    private Integer status;
    private Integer accountStatus;
}
