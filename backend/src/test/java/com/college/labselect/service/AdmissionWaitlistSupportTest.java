package com.college.labselect.service;

import com.college.labselect.entity.Admission;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.mapper.AdmissionMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.SelectionRoundMapper;
import com.college.labselect.mapper.WaitlistMapper;
import com.college.labselect.service.impl.AdmissionWaitlistSupport;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 录取逾期与名额释放支撑单元测试。
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AdmissionWaitlistSupportTest {

    @Mock
    private AdmissionMapper admissionMapper;

    @Mock
    private WaitlistMapper waitlistMapper;

    @Mock
    private MentorProfileMapper mentorProfileMapper;

    @Mock
    private SelectionRoundMapper selectionRoundMapper;

    @InjectMocks
    private AdmissionWaitlistSupport waitlistSupport;

    /**
     * 快乐路径：逾期待确认记录条件更新为逾期并释放名额。
     */
    @Test
    void expireIfPending_expired_shouldTimeoutAndReleaseQuota() {
        when(admissionMapper.selectById(901L))
                .thenReturn(admission(LocalDateTime.now().minusMinutes(5)));
        when(admissionMapper.update(isNull(), any())).thenReturn(1);
        when(mentorProfileMapper.decreaseQuotaUsed(11L, 1)).thenReturn(1);
        when(selectionRoundMapper.selectById(1L)).thenReturn(round());
        when(mentorProfileMapper.selectById(11L)).thenReturn(mentor());
        when(waitlistMapper.selectList(any())).thenReturn(List.of());

        boolean handled = waitlistSupport.expireIfPending(901L, LocalDateTime.now());

        assertThat(handled).isTrue();
        verify(admissionMapper).update(isNull(), any());
        verify(mentorProfileMapper).decreaseQuotaUsed(11L, 1);
    }

    /**
     * 边界：未到确认截止的待确认记录不处理。
     */
    @Test
    void expireIfPending_notExpired_shouldSkip() {
        when(admissionMapper.selectById(901L))
                .thenReturn(admission(LocalDateTime.now().plusMinutes(5)));

        boolean handled = waitlistSupport.expireIfPending(901L, LocalDateTime.now());

        assertThat(handled).isFalse();
        verify(admissionMapper, never()).update(any(), any());
        verify(mentorProfileMapper, never()).decreaseQuotaUsed(anyLong(), anyInt());
    }

    private Admission admission(LocalDateTime deadline) {
        Admission admission = new Admission();
        admission.setId(901L);
        admission.setRoundId(1L);
        admission.setStudentId(1001L);
        admission.setLabId(1L);
        admission.setMentorId(11L);
        admission.setStatus(1);
        admission.setPendingType(4);
        admission.setConfirmDeadline(deadline);
        return admission;
    }

    private SelectionRound round() {
        SelectionRound round = new SelectionRound();
        round.setId(1L);
        round.setNominationEnd(LocalDateTime.now().minusHours(1));
        return round;
    }

    private MentorProfile mentor() {
        MentorProfile mentor = new MentorProfile();
        mentor.setId(11L);
        mentor.setLabId(1L);
        mentor.setUserId(2001L);
        mentor.setStatus(1);
        return mentor;
    }
}
