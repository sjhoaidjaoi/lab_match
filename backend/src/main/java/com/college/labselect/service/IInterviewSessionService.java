package com.college.labselect.service;

import com.college.labselect.dto.req.InterviewSessionSaveReqDTO;
import com.college.labselect.dto.resp.InterviewSessionVO;
import com.college.labselect.dto.resp.PublishScheduleRespVO;

import java.util.List;

/**
 * 面试场次服务。
 */
public interface IInterviewSessionService {

    /**
     * 查询本室面试场次。
     *
     * @param leaderUserId 负责人用户 ID
     * @param roundId      轮次 ID
     * @return 场次列表
     */
    List<InterviewSessionVO> listSessions(Long leaderUserId, Long roundId);

    /**
     * 新增面试场次。
     *
     * @param leaderUserId 负责人用户 ID
     * @param req          新增请求
     * @return 场次 ID
     */
    Long createSession(Long leaderUserId, InterviewSessionSaveReqDTO req);

    /**
     * 修改面试场次。
     *
     * @param leaderUserId 负责人用户 ID
     * @param id           场次 ID
     * @param req          修改请求
     */
    void updateSession(Long leaderUserId, Long id, InterviewSessionSaveReqDTO req);

    /**
     * 删除面试场次。
     *
     * @param leaderUserId 负责人用户 ID
     * @param id           场次 ID
     */
    void deleteSession(Long leaderUserId, Long id);

    /**
     * 发布排期。
     *
     * @param leaderUserId 负责人用户 ID
     * @param roundId      轮次 ID
     * @return 发布结果
     */
    PublishScheduleRespVO publish(Long leaderUserId, Long roundId);

    /**
     * 取消发布并重排，已发布场次回退为草稿并通知学生。
     *
     * @param leaderUserId 负责人用户 ID
     * @param roundId      轮次 ID
     * @param reason       取消原因
     * @return 取消结果
     */
    PublishScheduleRespVO cancelPublish(Long leaderUserId, Long roundId, String reason);
}
