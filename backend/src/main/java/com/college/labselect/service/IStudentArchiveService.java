package com.college.labselect.service;

import com.college.labselect.dto.req.StudentArchiveSaveReqDTO;
import com.college.labselect.dto.resp.StudentArchiveRespVO;
import com.college.labselect.dto.resp.StudentArchiveSaveRespVO;

/**
 * 学生档案服务。
 */
public interface IStudentArchiveService {

    /**
     * 查询我的档案。
     *
     * @param studentUserId 学生用户 ID
     * @return 档案详情，未创建时返回 null
     */
    StudentArchiveRespVO getArchive(Long studentUserId);

    /**
     * 保存我的档案。
     *
     * @param studentUserId 学生用户 ID
     * @param req           保存请求
     * @return 缺失的必填项
     */
    StudentArchiveSaveRespVO saveArchive(Long studentUserId, StudentArchiveSaveReqDTO req);
}
