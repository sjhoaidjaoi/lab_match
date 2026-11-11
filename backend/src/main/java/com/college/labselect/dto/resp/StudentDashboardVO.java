package com.college.labselect.dto.resp;

import lombok.Data;

import java.util.List;

/**
 * 学生工作台聚合数据，字段对齐 04_API.md §3.6。
 */
@Data
public class StudentDashboardVO {

    private DashboardRoundVO round;

    private List<DashboardTodoVO> todo;

    private DashboardIntentionSummaryVO intentionSummary;

    private Integer unreadNoticeCount;
}
