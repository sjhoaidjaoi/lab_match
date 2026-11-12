package com.college.labselect.service;

import com.college.labselect.common.PageResult;
import com.college.labselect.dto.req.NoticeReadReqDTO;
import com.college.labselect.dto.resp.NoticeItemVO;
import com.college.labselect.dto.resp.UnreadCountVO;

/**
 * 站内通知服务。
 */
public interface INoticeService {

    /**
     * 查询我的通知列表。
     *
     * @param userId     用户 ID
     * @param isRead     已读状态筛选，可为空
     * @param noticeType 通知类型筛选，可为空
     * @param pageNum    页码
     * @param pageSize   每页条数
     * @return 通知分页
     */
    PageResult<NoticeItemVO> listNotices(Long userId, Integer isRead, Integer noticeType,
                                         long pageNum, long pageSize);

    /**
     * 标记通知已读，ids 为空表示全部。
     *
     * @param userId 用户 ID
     * @param req    已读请求
     */
    void markRead(Long userId, NoticeReadReqDTO req);

    /**
     * 查询未读数量。
     *
     * @param userId 用户 ID
     * @return 未读数量
     */
    UnreadCountVO unreadCount(Long userId);
}
