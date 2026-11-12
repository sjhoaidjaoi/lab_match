package com.college.labselect.service;

import com.college.labselect.common.PageResult;
import com.college.labselect.dto.req.AdminReallocationReqDTO;
import com.college.labselect.dto.req.AdmissionAdjustReqDTO;
import com.college.labselect.dto.req.LeaderReallocationReqDTO;
import com.college.labselect.dto.resp.AdminReallocationRespVO;
import com.college.labselect.dto.resp.AdmissionAdjustRespVO;
import com.college.labselect.dto.resp.LeaderReallocationRespVO;
import com.college.labselect.dto.resp.ReallocationCandidateVO;

/**
 * 三级统筹调剂与阶段内调整服务。
 */
public interface IReallocationService {

    /**
     * 本室内部调剂候选（仅服从内部调剂的未录取学生）。
     *
     * @param leaderUserId 负责人用户 ID
     * @param roundId      轮次 ID
     * @param pageNum      页码
     * @param pageSize     每页条数
     * @return 候选分页
     */
    PageResult<ReallocationCandidateVO> listLeaderCandidates(Long leaderUserId, Long roundId,
                                                             long pageNum, long pageSize);

    /**
     * 负责人执行本室内部调剂。
     *
     * @param leaderUserId 负责人用户 ID
     * @param req          调剂请求
     * @return 调剂记录与录取记录 ID
     */
    LeaderReallocationRespVO reallocateInner(Long leaderUserId, LeaderReallocationReqDTO req);

    /**
     * 管理员查询三级调剂候选。
     *
     * @param roundId  轮次 ID
     * @param level    调剂级别 1/2/3
     * @param pageNum  页码
     * @param pageSize 每页条数
     * @return 候选分页
     */
    PageResult<ReallocationCandidateVO> listAdminCandidates(Long roundId, Integer level,
                                                            long pageNum, long pageSize);

    /**
     * 管理员执行调剂，支持批量与部分成功。
     *
     * @param adminUserId 管理员用户 ID
     * @param req         调剂请求
     * @return 成功与失败明细
     */
    AdminReallocationRespVO reallocateByAdmin(Long adminUserId, AdminReallocationReqDTO req);

    /**
     * 管理员阶段内调整录取。
     *
     * @param adminUserId 管理员用户 ID
     * @param admissionId 录取记录 ID
     * @param req         调整请求
     * @return 调整结果
     */
    AdmissionAdjustRespVO adjustAdmission(Long adminUserId, Long admissionId, AdmissionAdjustReqDTO req);
}
