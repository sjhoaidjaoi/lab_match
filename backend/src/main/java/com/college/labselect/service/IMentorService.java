package com.college.labselect.service;

import com.college.labselect.common.PageResult;
import com.college.labselect.dto.req.MentorCreateReqDTO;
import com.college.labselect.dto.req.MentorQuotaReqDTO;
import com.college.labselect.dto.req.MentorStatusReqDTO;
import com.college.labselect.dto.req.MentorUpdateReqDTO;
import com.college.labselect.dto.resp.MentorListVO;
import com.college.labselect.dto.resp.QuotaOverviewVO;
import com.college.labselect.dto.resp.StudentImportResultVO;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 导师与名额服务。
 */
public interface IMentorService {

    /**
     * 管理端分页查询教师账号。
     *
     * @param labId    实训室 ID
     * @param keyword  工号或姓名关键词
     * @param status   状态
     * @param pageNum  页码
     * @param pageSize 每页条数
     * @return 分页结果
     */
    PageResult<MentorListVO> pageAdminMentors(Long labId, String keyword, Integer status, long pageNum, long pageSize);

    /**
     * 新增教师账号并生成导师档案。
     *
     * @param req 新增请求
     * @return 导师档案 ID
     */
    Long createMentor(MentorCreateReqDTO req);

    /**
     * 编辑教师账号。
     *
     * @param id  导师档案 ID
     * @param req 修改请求
     */
    void updateMentor(Long id, MentorUpdateReqDTO req);

    /**
     * 批量导入教师。
     *
     * @param file Excel 文件
     * @return 成功数、失败数与失败明细
     */
    StudentImportResultVO importMentors(MultipartFile file);

    /**
     * 重置教师密码。
     *
     * @param id 导师档案 ID
     */
    void resetPassword(Long id);

    /**
     * 启用 / 禁用教师。
     *
     * @param id  导师档案 ID
     * @param req 状态请求
     */
    void updateStatus(Long id, MentorStatusReqDTO req);

    /**
     * 查询当前负责人所属实训室的导师与名额。
     *
     * @param leaderUserId 负责人用户 ID
     * @return 导师列表
     */
    List<MentorListVO> listLeaderMentors(Long leaderUserId);

    /**
     * 负责人调整本室导师名额。
     *
     * @param leaderUserId 负责人用户 ID
     * @param mentorId     导师档案 ID
     * @param req          调整请求
     */
    void adjustQuotaByLeader(Long leaderUserId, Long mentorId, MentorQuotaReqDTO req);

    /**
     * 管理员强制调整导师名额。
     *
     * @param mentorId 导师档案 ID
     * @param req      调整请求
     */
    void forceAdjustQuota(Long mentorId, MentorQuotaReqDTO req);

    /**
     * 全院名额总览。
     *
     * @return 名额总览
     */
    List<QuotaOverviewVO> quotaOverview();

    /**
     * 导出名额 Excel。
     *
     * @return Excel 字节流
     */
    byte[] exportQuotas();
}
