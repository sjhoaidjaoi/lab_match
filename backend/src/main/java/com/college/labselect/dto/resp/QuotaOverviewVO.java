package com.college.labselect.dto.resp;

import lombok.Data;

/**
 * 全院名额总览项。
 */
@Data
public class QuotaOverviewVO {

    private Long labId;
    private String labName;
    private Integer totalQuota;
    private Integer quotaSum;
    private Integer quotaUsedSum;
    private Integer remainQuota;
}
