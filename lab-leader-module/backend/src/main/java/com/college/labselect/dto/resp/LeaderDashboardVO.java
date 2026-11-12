package com.college.labselect.dto.resp;

import lombok.Data;

import java.util.List;

/**
 * 本室工作台聚合数据，字段对齐 04_API.md §3.23。
 */
@Data
public class LeaderDashboardVO {

    private DashboardRoundVO round;

    private Integer mentorCount;

    private Integer totalQuota;

    private Integer quotaUsed;

    private Integer remainQuota;

    private Integer applicantCount;

    private Integer pendingScoreCount;

    private List<DashboardTodoVO> todo;
}
