package com.college.labselect.service;

import com.college.labselect.common.PageResult;
import com.college.labselect.dto.req.DisputeHandleReqDTO;
import com.college.labselect.dto.req.DisputeSubmitReqDTO;
import com.college.labselect.dto.resp.DisputeHandleRespVO;
import com.college.labselect.dto.resp.DisputeItemVO;
import com.college.labselect.dto.resp.DisputeSubmitRespVO;

/**
 * 异议工单服务。
 */
public interface IDisputeService {

    /**
     * 学生提交异议。
     *
     * @param studentUserId 学生用户 ID
     * @param req           提交请求
     * @return 工单号与状态
     */
    DisputeSubmitRespVO submitDispute(Long studentUserId, DisputeSubmitReqDTO req);

    /**
     * 学生查询我的异议列表。
     *
     * @param studentUserId 学生用户 ID
     * @param pageNum       页码
     * @param pageSize      每页条数
     * @return 异议分页
     */
    PageResult<DisputeItemVO> listMyDisputes(Long studentUserId, long pageNum, long pageSize);

    /**
     * 学生查看我的异议详情。
     *
     * @param studentUserId 学生用户 ID
     * @param id            工单 ID
     * @return 异议详情
     */
    DisputeItemVO getMyDispute(Long studentUserId, Long id);

    /**
     * 管理员查询异议工单列表。
     *
     * @param status     状态筛选，可为空
     * @param publicityId 公示批次筛选，可为空
     * @param pageNum    页码
     * @param pageSize   每页条数
     * @return 异议分页
     */
    PageResult<DisputeItemVO> listAdminDisputes(Integer status, Long publicityId, long pageNum, long pageSize);

    /**
     * 管理员处理异议。
     *
     * @param adminUserId 管理员用户 ID
     * @param id          工单 ID
     * @param req         处理请求
     * @return 处理结果
     */
    DisputeHandleRespVO handleDispute(Long adminUserId, Long id, DisputeHandleReqDTO req);
}
