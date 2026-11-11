package com.college.labselect.service;

import com.college.labselect.dto.req.ScheduleAdjustReqDTO;
import com.college.labselect.dto.resp.InterviewScheduleVO;
import com.college.labselect.dto.resp.StudentInterviewVO;

import java.util.List;

/**
 * 面试排期服务。
 */
public interface IInterviewScheduleService {

    /**
     * 查询本室排期。
     *
     * @param leaderUserId 负责人用户 ID
     * @param roundId      轮次 ID
     * @return 排期列表
     */
    List<InterviewScheduleVO> listSchedules(Long leaderUserId, Long roundId);

    /**
     * 自动分配排期。
     *
     * @param leaderUserId 负责人用户 ID
     * @param roundId      轮次 ID
     */
    void autoSchedule(Long leaderUserId, Long roundId);

    /**
     * 手工调整排期。
     *
     * @param leaderUserId 负责人用户 ID
     * @param req          调整请求
     */
    void adjustSchedules(Long leaderUserId, ScheduleAdjustReqDTO req);

    /**
     * 查询学生本人的面试安排。
     *
     * @param studentUserId 学生用户 ID
     * @param roundId       轮次 ID
     * @return 面试安排
     */
    List<StudentInterviewVO> listStudentInterviews(Long studentUserId, Long roundId);
}
