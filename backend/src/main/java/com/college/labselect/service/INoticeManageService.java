package com.college.labselect.service;

import com.college.labselect.common.PageResult;
import com.college.labselect.dto.req.NoticeSaveReqDTO;
import com.college.labselect.dto.req.NoticeStatusReqDTO;
import com.college.labselect.dto.resp.NoticeAdminVO;
import com.college.labselect.dto.resp.PublicNoticeVO;

/**
 * 公告管理服务，维护 notice 表（宣讲 / 开放日 / 公示 / 通知）。
 */
public interface INoticeManageService {

    /**
     * 管理端公告列表。
     *
     * @param keyword    标题关键词，可为空
     * @param noticeType 公告类型，可为空
     * @param status     公告状态，可为空
     * @param pageNum    页码
     * @param pageSize   每页条数
     * @return 公告分页
     */
    PageResult<NoticeAdminVO> pageAdminNotices(String keyword, Integer noticeType, Integer status,
                                               long pageNum, long pageSize);

    /**
     * 新建公告。
     *
     * @param adminUserId 管理员用户 ID
     * @param req         公告内容与初始状态
     * @return 新建后的公告
     */
    NoticeAdminVO createNotice(Long adminUserId, NoticeSaveReqDTO req);

    /**
     * 编辑公告，仅更新标题、类型、正文与附件，状态不变。
     *
     * @param id  公告 ID
     * @param req 公告内容
     */
    void updateNotice(Long id, NoticeSaveReqDTO req);

    /**
     * 发布 / 下线公告。
     *
     * @param id  公告 ID
     * @param req 目标状态：2 已发布 3 已下线
     */
    void updateStatus(Long id, NoticeStatusReqDTO req);

    /**
     * 公共端公告列表，仅返回已发布公告。
     *
     * @param noticeType 公告类型，可为空
     * @param pageNum    页码
     * @param pageSize   每页条数
     * @return 公告分页
     */
    PageResult<PublicNoticeVO> pagePublicNotices(Integer noticeType, long pageNum, long pageSize);

    /**
     * 公共端公告详情，未发布或不存在返回 404001。
     *
     * @param id 公告 ID
     * @return 公告详情
     */
    PublicNoticeVO getPublicNotice(Long id);
}
