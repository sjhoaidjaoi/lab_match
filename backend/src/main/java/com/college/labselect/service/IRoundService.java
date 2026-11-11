package com.college.labselect.service;

import com.college.labselect.common.PageResult;
import com.college.labselect.dto.req.RoundCreateReqDTO;
import com.college.labselect.dto.req.RoundStatusReqDTO;
import com.college.labselect.dto.req.RoundUpdateReqDTO;
import com.college.labselect.dto.resp.CurrentRoundVO;
import com.college.labselect.dto.resp.RoundListVO;

/**
 * 选拔轮次服务。
 */
public interface IRoundService {

    /**
     * 管理端分页查询轮次。
     *
     * @param pageNum  页码
     * @param pageSize 每页条数
     * @return 分页结果
     */
    PageResult<RoundListVO> pageRounds(long pageNum, long pageSize);

    /**
     * 新建轮次。
     *
     * @param req 新建请求
     * @return 轮次 ID
     */
    Long createRound(RoundCreateReqDTO req);

    /**
     * 修改轮次时间窗与权重。
     *
     * @param id  轮次 ID
     * @param req 修改请求
     */
    void updateRound(Long id, RoundUpdateReqDTO req);

    /**
     * 开启 / 结束轮次。
     *
     * @param id  轮次 ID
     * @param req 状态请求
     */
    void updateStatus(Long id, RoundStatusReqDTO req);

    /**
     * 公共端查询当前轮次。
     *
     * @return 当前轮次
     */
    CurrentRoundVO getCurrentRound();

    /**
     * 手动重跑批次签发。
     *
     * @param id 轮次 ID
     */
    void issueRound(Long id);
}
