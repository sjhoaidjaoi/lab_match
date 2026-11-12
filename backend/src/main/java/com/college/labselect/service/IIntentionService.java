package com.college.labselect.service;

import com.college.labselect.common.PageResult;
import com.college.labselect.dto.req.IntentionSaveReqDTO;
import com.college.labselect.dto.resp.AvailableMentorVO;
import com.college.labselect.dto.resp.IntentionRespVO;
import com.college.labselect.dto.resp.IntentionSaveRespVO;

/**
 * 意向填报服务。
 */
public interface IIntentionService {

    /**
     * 查询我的填报。
     *
     * @param studentUserId 学生用户 ID
     * @param roundId       轮次 ID，为空取当前轮
     * @return 填报详情，未填报时返回 null
     */
    IntentionRespVO getIntention(Long studentUserId, Long roundId);

    /**
     * 保存 / 提交填报。
     *
     * @param studentUserId 学生用户 ID
     * @param req           保存请求
     * @return 填报 ID 与状态
     */
    IntentionSaveRespVO saveIntention(Long studentUserId, IntentionSaveReqDTO req);

    /**
     * 分页查询可选导师。
     *
     * @param keyword       姓名或研究方向关键词
     * @param labId         实训室 ID
     * @param onlyAvailable 1 仅显示有剩余名额
     * @param pageNum       页码
     * @param pageSize      每页条数
     * @return 分页结果
     */
    PageResult<AvailableMentorVO> pageAvailableMentors(String keyword, Long labId, Integer onlyAvailable,
                                                        long pageNum, long pageSize);
}
