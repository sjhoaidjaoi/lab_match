package com.college.labselect.dto.resp;

import lombok.Data;

/**
 * 导师工作台聚合数据，字段对齐 04_API.md §3.17。
 */
@Data
public class TeacherDashboardVO {

    private DashboardRoundVO round;

    private Integer quota;

    private Integer quotaUsed;

    private Integer remainQuota;

    private Integer applicantCount;

    private Integer applicantVisible;

    private Integer pendingScoreCount;

    private Integer pendingNomination;

    private Integer pendingWaitlistAdjust;
}
