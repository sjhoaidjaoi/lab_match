package com.college.labselect.service;

import com.college.labselect.dto.req.WaitlistRankItemReqDTO;
import com.college.labselect.dto.req.WaitlistRankReqDTO;
import com.college.labselect.dto.resp.WaitlistItemVO;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.SysUser;
import com.college.labselect.entity.Waitlist;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.InterviewScoreMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.OperationLogMapper;
import com.college.labselect.mapper.SelectionRoundMapper;
import com.college.labselect.mapper.StudentProfileMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.mapper.WaitlistMapper;
import com.college.labselect.service.impl.WaitlistServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 递补名单服务单元测试，阶段 3 以红灯作为阶段 4 的编码边界。
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class WaitlistServiceTest {

    @Mock
    private WaitlistMapper waitlistMapper;

    @Mock
    private MentorProfileMapper mentorProfileMapper;

    @Mock
    private SelectionRoundMapper selectionRoundMapper;

    @Mock
    private InterviewScoreMapper interviewScoreMapper;

    @Mock
    private StudentProfileMapper studentProfileMapper;

    @Mock
    private SysUserMapper sysUserMapper;

    @Mock
    private OperationLogMapper operationLogMapper;

    @InjectMocks
    private WaitlistServiceImpl waitlistService;

    /**
     * 快乐路径：调整顺位成功并标记手工调整。
     */
    @Test
    void adjustRank_success_shouldMarkManual() {
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor());
        when(waitlistMapper.selectById(1101L)).thenReturn(waitlist(1101L, 11L, 3));
        when(waitlistMapper.updateById(any(Waitlist.class))).thenReturn(1);

        waitlistService.adjustRank(2001L, rankReq(1101L, 1));

        verify(waitlistMapper).updateById(any(Waitlist.class));
    }

    /**
     * 边界：顺位重复返回 400002。
     */
    @Test
    void adjustRank_duplicateRank_shouldThrow400002() {
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor());
        when(waitlistMapper.selectById(any())).thenAnswer(invocation -> waitlist(invocation.getArgument(0), 11L, 1));

        WaitlistRankReqDTO req = new WaitlistRankReqDTO();
        req.setRoundId(1L);
        req.setItems(List.of(item(1101L, 1), item(1102L, 1)));
        req.setAdjustReason("线下约谈后综合判断");

        BusinessException exception = catchThrowableOfType(
                () -> waitlistService.adjustRank(2001L, req), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400002);
    }

    /**
     * 边界：调整他人递补记录返回 403001。
     */
    @Test
    void adjustRank_notOwned_shouldThrow403001() {
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor());
        when(waitlistMapper.selectById(1101L)).thenReturn(waitlist(1101L, 99L, 1));

        BusinessException exception = catchThrowableOfType(
                () -> waitlistService.adjustRank(2001L, rankReq(1101L, 1)), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(403001);
    }

    /**
     * 快乐路径：列表返回脱敏学号与姓名。
     */
    @Test
    void listWaitlist_shouldMaskStudentInfo() {
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor());
        when(waitlistMapper.selectList(any())).thenReturn(List.of(waitlist(1101L, 11L, 1)));
        when(sysUserMapper.selectBatchIds(any())).thenReturn(List.of(student()));

        List<WaitlistItemVO> result = waitlistService.listWaitlist(2001L, 1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStudentNo()).isEqualTo("2022****02");
        assertThat(result.get(0).getStudentName()).isEqualTo("张*强");
    }

    private MentorProfile mentor() {
        MentorProfile mentor = new MentorProfile();
        mentor.setId(11L);
        mentor.setUserId(2001L);
        mentor.setLabId(1L);
        return mentor;
    }

    private Waitlist waitlist(Long id, Long mentorId, int rankNo) {
        Waitlist waitlist = new Waitlist();
        waitlist.setId(id);
        waitlist.setRoundId(1L);
        waitlist.setMentorId(mentorId);
        waitlist.setStudentId(1002L);
        waitlist.setRankNo(rankNo);
        waitlist.setIsManual(0);
        waitlist.setApplyStatus(1);
        return waitlist;
    }

    private SysUser student() {
        SysUser user = new SysUser();
        user.setId(1002L);
        user.setUserNo("20220002");
        user.setRealName("张伟强");
        user.setUserType(1);
        return user;
    }

    private WaitlistRankReqDTO rankReq(Long waitlistId, int rankNo) {
        WaitlistRankReqDTO req = new WaitlistRankReqDTO();
        req.setRoundId(1L);
        req.setItems(List.of(item(waitlistId, rankNo)));
        req.setAdjustReason("线下约谈后综合判断");
        return req;
    }

    private WaitlistRankItemReqDTO item(Long waitlistId, int rankNo) {
        WaitlistRankItemReqDTO item = new WaitlistRankItemReqDTO();
        item.setWaitlistId(waitlistId);
        item.setRankNo(rankNo);
        return item;
    }
}
