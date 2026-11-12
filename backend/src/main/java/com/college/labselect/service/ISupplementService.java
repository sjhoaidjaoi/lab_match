package com.college.labselect.service;

import com.college.labselect.common.PageResult;
import com.college.labselect.dto.req.SupplementDirectAdmitReqDTO;
import com.college.labselect.dto.req.TakeReallocationReqDTO;
import com.college.labselect.dto.resp.AvailableMentorVO;
import com.college.labselect.dto.resp.ReallocationPoolVO;
import com.college.labselect.dto.resp.SupplementDirectAdmitRespVO;
import com.college.labselect.dto.resp.TakeReallocationRespVO;

/**
 * 补录与跨室调剂池服务。
 */
public interface ISupplementService {

    /**
     * 学生补录可选导师，仅返回仍有剩余名额的导师。
     *
     * @param studentUserId 学生用户 ID
     * @return 可选导师分页
     */
    PageResult<AvailableMentorVO> listSupplementMentors(Long studentUserId);

    /**
     * 导师查看全院调剂池。
     *
     * @param teacherUserId 教师用户 ID
     * @param roundId       轮次 ID
     * @param keyword       关键词
     * @param pageNum       页码
     * @param pageSize      每页条数
     * @return 调剂池分页
     */
    ReallocationPoolVO listTeacherPool(Long teacherUserId, Long roundId, String keyword,
                                       long pageNum, long pageSize);

    /**
     * 导师抢录池内学生，先到先得且直接生效。
     *
     * @param teacherUserId 教师用户 ID
     * @param studentId     学生用户 ID
     * @param req           录入理由
     * @return 录取记录与导师 ID
     */
    TakeReallocationRespVO take(Long teacherUserId, Long studentId, TakeReallocationReqDTO req);

    /**
     * 补录轮导师直接录入（免面试）。
     *
     * @param teacherUserId 教师用户 ID
     * @param req           直接录入请求
     * @return 录取记录与状态
     */
    SupplementDirectAdmitRespVO directAdmit(Long teacherUserId, SupplementDirectAdmitReqDTO req);
}
