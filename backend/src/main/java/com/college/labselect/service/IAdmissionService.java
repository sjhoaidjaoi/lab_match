package com.college.labselect.service;

import com.college.labselect.dto.req.ConfirmRespondReqDTO;
import com.college.labselect.dto.resp.AdmissionListVO;
import com.college.labselect.dto.resp.ConfirmCenterVO;
import com.college.labselect.dto.resp.ConfirmRespondRespVO;

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
}
