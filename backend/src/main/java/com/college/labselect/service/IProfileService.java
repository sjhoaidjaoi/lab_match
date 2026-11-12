package com.college.labselect.service;

import com.college.labselect.dto.req.ProfileUpdateReqDTO;
import com.college.labselect.dto.resp.ProfileRespVO;

/**
 * 个人中心服务，仅允许修改手机号与邮箱。
 */
public interface IProfileService {

    /**
     * 查询学生个人信息。
     *
     * @param userId 当前用户 ID
     * @return 个人信息
     */
    ProfileRespVO getStudentProfile(Long userId);

    /**
     * 修改学生个人信息。
     *
     * @param userId 当前用户 ID
     * @param req    手机号与邮箱
     */
    void updateStudentProfile(Long userId, ProfileUpdateReqDTO req);

    /**
     * 查询教师个人信息。
     *
     * @param userId 当前用户 ID
     * @return 个人信息
     */
    ProfileRespVO getTeacherProfile(Long userId);

    /**
     * 修改教师个人信息。
     *
     * @param userId 当前用户 ID
     * @param req    手机号与邮箱
     */
    void updateTeacherProfile(Long userId, ProfileUpdateReqDTO req);
}
