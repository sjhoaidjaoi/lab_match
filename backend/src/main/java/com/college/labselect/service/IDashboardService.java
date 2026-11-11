package com.college.labselect.service;

import com.college.labselect.dto.resp.AdminDashboardVO;
import com.college.labselect.dto.resp.LeaderDashboardVO;
import com.college.labselect.dto.resp.StudentDashboardVO;
import com.college.labselect.dto.resp.TeacherDashboardVO;

/**
 * 工作台聚合服务，按角色返回首屏统计与待办。
 */
public interface IDashboardService {

    /**
     * 学生工作台：轮次、待办、填报摘要与未读通知数。
     *
     * @param studentId 学生用户 ID
     * @return 学生工作台数据
     */
    StudentDashboardVO getStudentDashboard(Long studentId);

    /**
     * 导师工作台：名额、报名人数与待办数量，填报截止前执行盲选门禁。
     *
     * @param teacherUserId 教师用户 ID
     * @return 导师工作台数据
     */
    TeacherDashboardVO getTeacherDashboard(Long teacherUserId);

    /**
     * 本室工作台：本室名额与报名聚合，填报截止前执行盲选门禁。
     *
     * @param leaderUserId 负责人用户 ID
     * @return 本室工作台数据
     */
    LeaderDashboardVO getLeaderDashboard(Long leaderUserId);

    /**
     * 管理员全院工作台：账号、名额、轮次与待办聚合。
     *
     * @return 全院工作台数据
     */
    AdminDashboardVO getAdminDashboard();
}
