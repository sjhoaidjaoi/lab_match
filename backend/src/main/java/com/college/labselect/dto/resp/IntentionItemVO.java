package com.college.labselect.dto.resp;

import lombok.Data;

/**
 * 意向明细项。
 */
@Data
public class IntentionItemVO {

    private Long mentorId;
    private String mentorName;
    private Long labId;
    private String labName;
    private String researchDirection;
    private Integer remainQuota;
}
