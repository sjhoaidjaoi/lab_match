package com.college.labselect.service;

import com.college.labselect.dto.req.LeaderNominationAdjustReqDTO;
import com.college.labselect.dto.req.NominationSaveReqDTO;
import com.college.labselect.dto.resp.LeaderNominationDetailVO;
import com.college.labselect.dto.resp.NominationItemVO;
import com.college.labselect.dto.resp.NominationSaveRespVO;

import java.util.List;

/**
 * 拟录取服务。
 */
public interface INominationService {

    /**
     * 保存或提交导师拟录取名单。
     *
     * @param teacherUserId 教师用户 ID
     * @param req           拟录取请求
     * @return 名额占用结果
     */
    NominationSaveRespVO saveNomination(Long teacherUserId, NominationSaveReqDTO req);

    /**
     * 查询我的拟录取列表。
     *
     * @param teacherUserId 教师用户 ID
     * @param roundId       轮次 ID
     * @return 拟录取列表
     */
    List<NominationItemVO> listMyNominations(Long teacherUserId, Long roundId);

    /**
     * 负责人查看某导师拟录取名单与候选学生。
     *
     * @param leaderUserId 负责人用户 ID
     * @param mentorId     导师档案 ID
     * @param roundId      轮次 ID
     * @return 名单详情
     */
    LeaderNominationDetailVO getLeaderMentorNominations(Long leaderUserId, Long mentorId, Long roundId);

    /**
     * 负责人调整某导师拟录取名单。
     *
     * @param leaderUserId 负责人用户 ID
     * @param mentorId     导师档案 ID
     * @param req          调整请求
     * @return 名额占用结果
     */
    NominationSaveRespVO saveLeaderMentorNominations(Long leaderUserId, Long mentorId,
                                                     LeaderNominationAdjustReqDTO req);
}
