package com.college.labselect.dto.resp;

import lombok.Data;

import java.util.List;

/**
 * 管理员全院工作台聚合数据，字段按 01_PRD.md 管理员工作台页面定义。
 */
@Data
public class AdminDashboardVO {

    private DashboardRoundVO round;

    private Integer labCount;

    private Integer mentorCount;

    private Integer studentCount;

    private Integer totalQuota;

    private Integer quotaUsed;

    private Integer remainQuota;

    private List<DashboardTodoVO> todo;
}
