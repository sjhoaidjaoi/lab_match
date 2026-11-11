package com.college.labselect.service;

import com.college.labselect.dto.resp.LeaderNominationSubmitRespVO;
import com.college.labselect.dto.resp.LeaderNominationSummaryVO;
import com.college.labselect.entity.Lab;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.Nomination;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.entity.SysUser;
import com.college.labselect.mapper.LabMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.NominationMapper;
import com.college.labselect.mapper.SelectionRoundMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.service.impl.LeaderNominationServiceImpl;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 本室拟录取汇总服务单元测试。
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class LeaderNominationServiceTest {

    @Mock
    private NominationMapper nominationMapper;

    @Mock
    private MentorProfileMapper mentorProfileMapper;

    @Mock
    private SelectionRoundMapper selectionRoundMapper;

    @Mock
    private LabMapper labMapper;

    @Mock
    private SysUserMapper sysUserMapper;

    @InjectMocks
    private LeaderNominationServiceImpl leaderNominationService;

    /**
     * 快乐路径：同一学生被本室两名导师拟录取时计入冲突。
     */
    @Test
    void summary_shouldDetectConflict() {
        when(labMapper.selectOne(any())).thenReturn(lab());
        when(selectionRoundMapper.selectById(1L)).thenReturn(round());
        when(mentorProfileMapper.selectList(any())).thenReturn(List.of(mentor(11L, 2001L), mentor(12L, 2002L)));
        when(nominationMapper.selectList(any())).thenReturn(List.of(
                nomination(11L, 1001L), nomination(12L, 1001L), nomination(11L, 1002L)));
        when(sysUserMapper.selectBatchIds(any())).thenReturn(
                List.of(user(2001L, "T001", "李海峰"), user(2002L, "T002", "王建国")),
                List.of(user(1001L, "20220001", "陈爱丽"), user(1002L, "20220002", "张强")));

        LeaderNominationSummaryVO result = leaderNominationService.summary(9001L, 1L);

        assertThat(result.getLabQuota()).isEqualTo(20);
        assertThat(result.getQuotaUsed()).isEqualTo(8);
        assertThat(result.getRemainQuota()).isEqualTo(12);
        assertThat(result.getConflictCount()).isEqualTo(1);
        assertThat(result.getConflicts().get(0).getMentorNames()).hasSize(2);
        assertThat(result.getMentors()).hasSize(2);
    }

    /**
     * 导师存在草稿拟录取时展示已勾选数量与待提交状态。
     */
    @Test
    void summary_shouldShowDraftCountAndPendingStatus() {
        when(labMapper.selectOne(any())).thenReturn(lab());
        when(selectionRoundMapper.selectById(1L)).thenReturn(round());
        when(mentorProfileMapper.selectList(any())).thenReturn(List.of(mentor(11L, 2001L), mentor(12L, 2002L)));
        Nomination draft = nomination(11L, 1001L);
        draft.setStatus(1);
        when(nominationMapper.selectList(any())).thenReturn(List.of(draft, nomination(12L, 1002L)));
        when(sysUserMapper.selectBatchIds(any())).thenReturn(
                List.of(user(2001L, "T001", "李海峰"), user(2002L, "T002", "王建国")),
                List.of(user(1001L, "20220001", "陈爱丽"), user(1002L, "20220002", "张强")));

        LeaderNominationSummaryVO result = leaderNominationService.summary(9001L, 1L);

        assertThat(result.getMentors().get(0).getNominatedCount()).isEqualTo(1);
        assertThat(result.getMentors().get(0).getSubmitStatus()).isEqualTo(1);
        assertThat(result.getMentors().get(1).getNominatedCount()).isEqualTo(1);
        assertThat(result.getMentors().get(1).getSubmitStatus()).isEqualTo(2);
        assertThat(result.getConflictCount()).isZero();
    }

    /**
     * 快乐路径：提交本室名单汇总草稿并返回条数与冲突数。
     */
    @Test
    void submit_shouldMarkDraftsAndReturnCount() {
        when(labMapper.selectOne(any())).thenReturn(lab());
        when(selectionRoundMapper.selectById(1L)).thenReturn(round());
        when(mentorProfileMapper.selectList(any())).thenReturn(List.of(mentor(11L, 2001L), mentor(12L, 2002L)));
        when(nominationMapper.selectList(any())).thenReturn(List.of(
                nomination(11L, 1001L), nomination(12L, 1002L)));
        when(sysUserMapper.selectBatchIds(any())).thenReturn(
                List.of(user(2001L, "T001", "李海峰"), user(2002L, "T002", "王建国")),
                List.of(user(1001L, "20220001", "陈爱丽"), user(1002L, "20220002", "张强")));

        LeaderNominationSubmitRespVO result = leaderNominationService.submit(9001L, 1L);

        assertThat(result.getAdmissionCount()).isEqualTo(2);
        assertThat(result.getConflictCount()).isZero();
        verify(nominationMapper, org.mockito.Mockito.atLeastOnce()).updateById(any(Nomination.class));
    }

    private Lab lab() {
        Lab lab = new Lab();
        lab.setId(1L);
        lab.setLeaderId(9001L);
        lab.setTotalQuota(20);
        return lab;
    }

    private SelectionRound round() {
        SelectionRound round = new SelectionRound();
        round.setId(1L);
        round.setRoundNo(1);
        round.setNominationStart(LocalDateTime.now().minusHours(1));
        round.setNominationSubmitEnd(LocalDateTime.now().plusHours(2));
        return round;
    }

    private MentorProfile mentor(Long id, Long userId) {
        MentorProfile mentor = new MentorProfile();
        mentor.setId(id);
        mentor.setUserId(userId);
        mentor.setLabId(1L);
        mentor.setQuota(4);
        mentor.setQuotaUsed(4);
        return mentor;
    }

    private Nomination nomination(Long mentorId, Long studentId) {
        Nomination nomination = new Nomination();
        nomination.setRoundId(1L);
        nomination.setLabId(1L);
        nomination.setMentorId(mentorId);
        nomination.setStudentId(studentId);
        nomination.setStatus(2);
        return nomination;
    }

    private SysUser user(Long id, String userNo, String realName) {
        SysUser user = new SysUser();
        user.setId(id);
        user.setUserNo(userNo);
        user.setRealName(realName);
        return user;
    }
}
