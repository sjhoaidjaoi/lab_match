package com.college.labselect.service;

import com.college.labselect.dto.req.NoticeReadReqDTO;
import com.college.labselect.dto.resp.UnreadCountVO;
import com.college.labselect.entity.UserNotice;
import com.college.labselect.mapper.UserNoticeMapper;
import com.college.labselect.service.impl.NoticeServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 站内通知服务单元测试，阶段 3 以红灯作为阶段 4 的编码边界。
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class NoticeServiceTest {

    @Mock
    private UserNoticeMapper userNoticeMapper;

    @InjectMocks
    private NoticeServiceImpl noticeService;

    /**
     * 快乐路径：未读数量按当前用户统计。
     */
    @Test
    void unreadCount_shouldReturnCount() {
        when(userNoticeMapper.selectCount(any())).thenReturn(3L);

        UnreadCountVO result = noticeService.unreadCount(1001L);

        assertThat(result.getCount()).isEqualTo(3L);
    }

    /**
     * 快乐路径：指定 ids 时仅标记这些通知已读。
     */
    @Test
    void markRead_withIds_shouldUpdateGivenNotices() {
        NoticeReadReqDTO req = new NoticeReadReqDTO();
        req.setIds(List.of(1L, 2L));
        when(userNoticeMapper.update(isNull(), any())).thenReturn(2);

        noticeService.markRead(1001L, req);

        verify(userNoticeMapper, atLeastOnce()).update(isNull(), any());
    }

    /**
     * 快乐路径：ids 为空时标记当前用户全部未读通知。
     */
    @Test
    void markRead_withoutIds_shouldUpdateAllUnread() {
        when(userNoticeMapper.update(isNull(), any())).thenReturn(5);

        noticeService.markRead(1001L, new NoticeReadReqDTO());

        verify(userNoticeMapper, atLeastOnce()).update(isNull(), any());
    }
}
