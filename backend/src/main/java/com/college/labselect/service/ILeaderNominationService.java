package com.college.labselect.service;

import com.college.labselect.dto.resp.LeaderNominationSubmitRespVO;
import com.college.labselect.dto.resp.LeaderNominationSummaryVO;

/**
 * 本室拟录取汇总服务。
 */
public interface ILeaderNominationService {

    /**
     * 本室拟录取汇总与冲突检测。
     *
     * @param leaderUserId 负责人用户 ID
     * @param roundId      轮次 ID
     * @return 汇总结果
     */
    LeaderNominationSummaryVO summary(Long leaderUserId, Long roundId);

    /**
     * 提交本室名单至学院。
     *
     * @param leaderUserId 负责人用户 ID
     * @param roundId      轮次 ID
     * @return 生成录取数与冲突数
     */
    LeaderNominationSubmitRespVO submit(Long leaderUserId, Long roundId);
}
