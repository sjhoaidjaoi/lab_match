package com.college.labselect.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.college.labselect.common.PageResult;
import com.college.labselect.common.StatusTextUtils;
import com.college.labselect.dto.req.NoticeReadReqDTO;
import com.college.labselect.dto.resp.NoticeItemVO;
import com.college.labselect.dto.resp.UnreadCountVO;
import com.college.labselect.entity.UserNotice;
import com.college.labselect.mapper.UserNoticeMapper;
import com.college.labselect.service.INoticeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 站内通知服务实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NoticeServiceImpl implements INoticeService {

    private static final int READ = 1;
    private static final int UNREAD = 0;
    private static final long MAX_PAGE_SIZE = 100L;

    private final UserNoticeMapper userNoticeMapper;

    @Override
    public PageResult<NoticeItemVO> listNotices(Long userId, Integer isRead, Integer noticeType,
                                                long pageNum, long pageSize) {
        long safePage = Math.max(1, pageNum);
        long safeSize = pageSize < 1 ? 10 : Math.min(pageSize, MAX_PAGE_SIZE);
        Page<UserNotice> page = new Page<>(safePage, safeSize);
        LambdaQueryWrapper<UserNotice> wrapper = new LambdaQueryWrapper<UserNotice>()
                .eq(UserNotice::getUserId, userId)
                .eq(isRead != null, UserNotice::getIsRead, isRead)
                .eq(noticeType != null, UserNotice::getNoticeType, noticeType)
                .orderByDesc(UserNotice::getGmtCreate)
                .orderByDesc(UserNotice::getId);
        Page<UserNotice> result = userNoticeMapper.selectPage(page, wrapper);
        List<NoticeItemVO> list = new ArrayList<>();
        for (UserNotice notice : result.getRecords()) {
            NoticeItemVO vo = new NoticeItemVO();
            vo.setId(notice.getId());
            vo.setTitle(notice.getTitle());
            vo.setContent(notice.getContent());
            vo.setNoticeType(notice.getNoticeType());
            vo.setNoticeTypeText(StatusTextUtils.userNoticeType(notice.getNoticeType()));
            vo.setBizType(notice.getBizType());
            vo.setBizId(notice.getBizId());
            vo.setIsRead(notice.getIsRead());
            vo.setReadTime(notice.getReadTime());
            vo.setGmtCreate(notice.getGmtCreate());
            list.add(vo);
        }
        return new PageResult<>(result.getTotal(), safePage, safeSize, list);
    }

    @Override
    public void markRead(Long userId, NoticeReadReqDTO req) {
        List<Long> ids = req == null ? null : req.getIds();
        UpdateWrapper<UserNotice> wrapper = new UpdateWrapper<UserNotice>()
                .set("is_read", READ)
                .set("read_time", LocalDateTime.now().withNano(0))
                .eq("user_id", userId)
                .eq("is_read", UNREAD);
        if (ids != null && !ids.isEmpty()) {
            wrapper.in("id", ids);
        }
        int updated = userNoticeMapper.update(null, wrapper);
        log.info("标记通知已读，userId={}，count={}", userId, updated);
    }

    @Override
    public UnreadCountVO unreadCount(Long userId) {
        UnreadCountVO vo = new UnreadCountVO();
        vo.setCount(userNoticeMapper.selectCount(new LambdaQueryWrapper<UserNotice>()
                .eq(UserNotice::getUserId, userId)
                .eq(UserNotice::getIsRead, UNREAD)));
        return vo;
    }
}
