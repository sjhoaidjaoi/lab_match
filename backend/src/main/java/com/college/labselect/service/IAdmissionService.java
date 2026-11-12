package com.college.labselect.service;

import com.college.labselect.dto.req.ConfirmRespondReqDTO;
import com.college.labselect.dto.resp.AdmissionListVO;
import com.college.labselect.dto.resp.ConfirmCenterVO;
import com.college.labselect.dto.resp.ConfirmRespondRespVO;
import com.college.labselect.dto.resp.LeaderAdmissionSummaryVO;

/**
 * 录取与确认服务。
 */
public interface IAdmissionService {

    /**
     * 学生录取待确认中心。
     *
     * @param studentUserId 学生用户 ID
     * @return 待确认列表
     */
    ConfirmCenterVO confirmCenter(Long studentUserId);

    /**
     * 学生接受或拒绝待确认记录。
     *
     * @param studentUserId 学生用户 ID
     * @param admissionId   录取记录 ID
     * @param req           响应请求
     * @return 响应结果
     */
    ConfirmRespondRespVO respond(Long studentUserId, Long admissionId, ConfirmRespondReqDTO req);

    /**
     * 导师我的录取名单。
     *
     * @param teacherUserId 教师用户 ID
     * @param roundId       轮次 ID
     * @return 录取名单
     */
    AdmissionListVO listTeacherAdmissions(Long teacherUserId, Long roundId);

    /**
     * 发送确认提醒。
     *
     * @param teacherUserId 教师用户 ID
     * @param admissionId   录取记录 ID
     */
    void remind(Long teacherUserId, Long admissionId);

    /**
     * 本室录取确认汇总与名单。
     *
     * @param leaderUserId 负责人用户 ID
     * @param roundId      轮次 ID
     * @param finalOnly    是否仅返回已确认/已入组名单
     * @return 汇总与名单
     */
    LeaderAdmissionSummaryVO listLeaderAdmissions(Long leaderUserId, Long roundId, boolean finalOnly);

    /**
     * 导出本室最终名单 Excel。
     *
     * @param leaderUserId 负责人用户 ID
     * @param roundId      轮次 ID
     * @return Excel 字节流
     */
    byte[] exportLeaderAdmissions(Long leaderUserId, Long roundId);
}
