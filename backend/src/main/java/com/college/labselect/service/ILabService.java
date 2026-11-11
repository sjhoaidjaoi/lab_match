package com.college.labselect.service;

import com.college.labselect.common.PageResult;
import com.college.labselect.dto.req.LabSaveReqDTO;
import com.college.labselect.dto.req.LeaderAssignReqDTO;
import com.college.labselect.dto.resp.LabDetailVO;
import com.college.labselect.dto.resp.LabListVO;
import com.college.labselect.dto.resp.LabMentorVO;

/**
 * 实训室服务。
 */
public interface ILabService {

    /**
     * 公共端分页查询实训室。
     *
     * @param keyword  名称关键词
     * @param status   状态
     * @param pageNum  页码
     * @param pageSize 每页条数
     * @return 分页结果
     */
    PageResult<LabListVO> pagePublicLabs(String keyword, Integer status, long pageNum, long pageSize);

    /**
     * 公共端查询实训室详情。
     *
     * @param id 实训室 ID
     * @return 实训室详情
     */
    LabDetailVO getPublicLabDetail(Long id);

    /**
     * 公共端查询导师详情。
     *
     * @param id 导师档案 ID
     * @return 导师简要信息
     */
    LabMentorVO getPublicMentor(Long id);

    /**
     * 管理端分页查询实训室。
     *
     * @param keyword  名称关键词
     * @param status   状态
     * @param pageNum  页码
     * @param pageSize 每页条数
     * @return 分页结果
     */
    PageResult<LabListVO> pageAdminLabs(String keyword, Integer status, long pageNum, long pageSize);

    /**
     * 新建实训室。
     *
     * @param req 新增请求
     * @return 新实训室 ID
     */
    Long createLab(LabSaveReqDTO req);

    /**
     * 修改实训室。
     *
     * @param id  实训室 ID
     * @param req 修改请求
     */
    void updateLab(Long id, LabSaveReqDTO req);

    /**
     * 删除实训室。
     *
     * @param id 实训室 ID
     */
    void deleteLab(Long id);

    /**
     * 提拔实训室负责人。
     *
     * @param id  实训室 ID
     * @param req 提拔请求
     */
    void assignLeader(Long id, LeaderAssignReqDTO req);
}
