package com.college.labselect.dto.resp;

import lombok.Data;

import java.util.List;

/**
 * 本室录取确认汇总，供负责人查看确认进度与最终名单。
 */
@Data
public class LeaderAdmissionSummaryVO {

    private Long roundId;
    private Long labId;
    private String labName;
    private Integer labQuota;
    private Integer allocatedQuota;
    private Integer quotaUsed;
    private Integer remainQuota;
    private Integer totalCount;
    private Integer pendingCount;
    private Integer confirmedCount;
    private Integer enrolledCount;
    private Integer abandonedCount;
    private List<LeaderAdmissionItemVO> items;
}
