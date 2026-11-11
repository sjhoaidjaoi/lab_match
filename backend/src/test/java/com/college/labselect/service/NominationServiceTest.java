package com.college.labselect.service;

import com.college.labselect.dto.req.NominationSaveReqDTO;
import com.college.labselect.dto.resp.NominationSaveRespVO;
import com.college.labselect.entity.Intention;
import com.college.labselect.entity.InterviewScore;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.IntentionItemMapper;
import com.college.labselect.mapper.IntentionMapper;
import com.college.labselect.mapper.InterviewScoreMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.NominationMapper;
import com.college.labselect.mapper.SelectionRoundMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.service.impl.NominationServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;

/**
 * 拟录取服务单元测试，阶段 3 以红灯作为阶段 4 的编码边界。
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class NominationServiceTest {

    @Mock
    private NominationMapper nominationMapper;

    @Mock
    private MentorProfileMapper mentorProfileMapper;

    @Mock
    private SelectionRoundMapper selectionRoundMapper;

    @Mock
    private InterviewScoreMapper interviewScoreMapper;

    @Mock
    private IntentionMapper intentionMapper;

    @Mock
    private IntentionItemMapper intentionItemMapper;

    @Mock
    private SysUserMapper sysUserMapper;

    @InjectMocks
    private NominationServiceImpl nominationService;

    /**
     * 快乐路径：名额 4 已用 2，提交 2 人后剩余 0。
     */
    @Test
    void saveNomination_success_shouldReturnRemainQuota() {
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor(4, 2));
        when(selectionRoundMapper.selectById(1L)).thenReturn(round(true));
        when(intentionMapper.selectList(any())).thenReturn(List.of(
                intention(1L, 1001L), intention(2L, 1002L)));
        when(intentionItemMapper.selectCount(any())).thenReturn(2L);
        when(interviewScoreMapper.selectList(any())).thenReturn(List.of(
                score(1L, 1001L), score(2L, 1002L)));
        when(mentorProfileMapper.increaseQuotaUsed(any(), anyInt())).thenReturn(1);

        NominationSaveRespVO result = nominationService.saveNomination(2001L, req(1, 1001L, 1002L));

        assertThat(result.getSubmittedCount()).isEqualTo(2);
        assertThat(result.getQuota()).isEqualTo(4);
        assertThat(result.getQuotaUsed()).isEqualTo(4);
        assertThat(result.getRemainQuota()).isZero();
    }

    /**
     * 边界：勾选人数超出个人名额返回 400003。
     */
    @Test
    void saveNomination_overQuota_shouldThrow400003() {
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor(2, 2));
        when(selectionRoundMapper.selectById(1L)).thenReturn(round(true));

        BusinessException exception = catchThrowableOfType(
                () -> nominationService.saveNomination(2001L, req(1, 1001L)), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400003);
    }

    /**
     * 边界：不在名单提交时间窗返回 400005。
     */
    @Test
    void saveNomination_outOfWindow_shouldThrow400005() {
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor(4, 0));
        when(selectionRoundMapper.selectById(1L)).thenReturn(round(false));

        BusinessException exception = catchThrowableOfType(
                () -> nominationService.saveNomination(2001L, req(1, 1001L)), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400005);
    }

    /**
     * 边界：名单已提交后再次修改返回 409001。
     */
    @Test
    void saveNomination_alreadySubmitted_shouldThrow409001() {
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor(4, 2));
        when(selectionRoundMapper.selectById(1L)).thenReturn(round(true));
        when(nominationMapper.selectCount(any())).thenReturn(2L);

        BusinessException exception = catchThrowableOfType(
                () -> nominationService.saveNomination(2001L, req(1, 1001L)), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(409001);
    }

    private MentorProfile mentor(int quota, int quotaUsed) {
        MentorProfile mentor = new MentorProfile();
        mentor.setId(11L);
        mentor.setUserId(2001L);
        mentor.setLabId(1L);
        mentor.setQuota(quota);
        mentor.setQuotaUsed(quotaUsed);
        return mentor;
    }

    private SelectionRound round(boolean inWindow) {
        SelectionRound round = new SelectionRound();
        round.setId(1L);
        round.setStatus(4);
        round.setNominationStart(LocalDateTime.now().minusHours(inWindow ? 1 : 5));
        round.setNominationSubmitEnd(LocalDateTime.now().plusHours(inWindow ? 2 : -3));
        return round;
    }

    private Intention intention(Long id, Long studentId) {
        Intention intention = new Intention();
        intention.setId(id);
        intention.setStudentId(studentId);
        intention.setStatus(2);
        return intention;
    }

    private InterviewScore score(Long id, Long studentId) {
        InterviewScore score = new InterviewScore();
        score.setId(id);
        score.setStudentId(studentId);
        score.setFinalTotal(new BigDecimal("85.75"));
        return score;
    }

    private NominationSaveReqDTO req(int submit, Long... studentIds) {
        NominationSaveReqDTO req = new NominationSaveReqDTO();
        req.setRoundId(1L);
        req.setStudentIds(List.of(studentIds));
        req.setSubmit(submit);
        return req;
    }
}
