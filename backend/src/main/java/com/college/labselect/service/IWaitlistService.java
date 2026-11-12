package com.college.labselect.service;

import com.college.labselect.dto.req.LeaderWaitlistRankReqDTO;
import com.college.labselect.dto.req.WaitlistRankReqDTO;
import com.college.labselect.dto.resp.LeaderWaitlistItemVO;
import com.college.labselect.dto.resp.WaitlistItemVO;

import java.util.List;

/**
 * 递补名单服务。
 */
public interface IWaitlistService {

    /**
     * 查询导师递补名单。
     *
     * @param teacherUserId 教师用户 ID
     * @param roundId       轮次 ID
     * @return 递补名单
     */
    List<WaitlistItemVO> listWaitlist(Long teacherUserId, Long roundId);

    /**
     * 调整递补顺位并留痕。
     *
     * @param teacherUserId 教师用户 ID
     * @param req           顺位调整请求
     */
    void adjustRank(Long teacherUserId, WaitlistRankReqDTO req);

    /**
     * 查询本室全部导师的递补名单。
     *
     * @param leaderUserId 负责人用户 ID
     * @param roundId      轮次 ID
     * @return 本室递补名单
     */
    List<LeaderWaitlistItemVO> listLeaderWaitlist(Long leaderUserId, Long roundId);

    /**
     * 负责人调整本室递补顺位并留痕。
     *
     * @param leaderUserId 负责人用户 ID
     * @param req          顺位调整请求
     */
    void adjustLeaderRank(Long leaderUserId, LeaderWaitlistRankReqDTO req);
}
