package com.college.labselect.service;

import com.college.labselect.dto.resp.AdminDashboardVO;
import com.college.labselect.dto.resp.DashboardTodoVO;
import com.college.labselect.dto.resp.LeaderDashboardVO;
import com.college.labselect.dto.resp.StudentDashboardVO;
import com.college.labselect.dto.resp.TeacherDashboardVO;
import com.college.labselect.entity.Intention;
import com.college.labselect.entity.IntentionItem;
import com.college.labselect.entity.Lab;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.AdmissionMapper;
import com.college.labselect.mapper.DisputeMapper;
import com.college.labselect.mapper.IntentionItemMapper;
import com.college.labselect.mapper.IntentionMapper;
import com.college.labselect.mapper.InterviewScheduleMapper;
import com.college.labselect.mapper.InterviewScoreMapper;
import com.college.labselect.mapper.InterviewSessionMapper;
import com.college.labselect.mapper.LabMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.NominationMapper;
import com.college.labselect.mapper.PublicityMapper;
import com.college.labselect.mapper.SelectionRoundMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.mapper.UserNoticeMapper;
import com.college.labselect.mapper.WaitlistMapper;
import com.college.labselect.service.impl.DashboardServiceImpl;
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
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 工作台聚合服务单元测试，阶段 3 以红灯作为阶段 4 的编码边界。
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DashboardServiceTest {

    @Mock
    private SelectionRoundMapper selectionRoundMapper;

    @Mock
    private IntentionMapper intentionMapper;

    @Mock
    private IntentionItemMapper intentionItemMapper;

    @Mock
    private InterviewScheduleMapper interviewScheduleMapper;

    @Mock
    private AdmissionMapper admissionMapper;

    @Mock
    private UserNoticeMapper userNoticeMapper;

    @Mock
    private MentorProfileMapper mentorProfileMapper;

    @Mock
    private LabMapper labMapper;

    @Mock
    private SysUserMapper sysUserMapper;

    @Mock
    private NominationMapper nominationMapper;

    @Mock
    private WaitlistMapper waitlistMapper;

    @Mock
    private InterviewScoreMapper interviewScoreMapper;

    @Mock
    private InterviewSessionMapper interviewSessionMapper;

    @Mock
    private DisputeMapper disputeMapper;

    @Mock
    private PublicityMapper publicityMapper;

    @InjectMocks
    private DashboardServiceImpl dashboardService;

    /**
     * 快乐路径：学生工作台按未完成事项生成待办并回填填报摘要。
     */
    @Test
    void getStudentDashboard_shouldAggregateTodoAndIntention() {
        when(selectionRoundMapper.selectOne(any())).thenReturn(round(2, LocalDateTime.now().plusHours(2)));
        when(intentionMapper.selectOne(any())).thenReturn(intention(1));
        when(intentionItemMapper.selectList(any())).thenReturn(List.of(intentionItem(11L, 1L)));
        when(interviewScheduleMapper.selectCount(any())).thenReturn(2L);
        when(admissionMapper.selectCount(any())).thenReturn(1L);
        when(userNoticeMapper.selectCount(any())).thenReturn(3L);

        StudentDashboardVO result = dashboardService.getStudentDashboard(1001L);

        assertThat(result.getRound().getRoundNo()).isEqualTo(1);
        assertThat(result.getRound().getStatusText()).isEqualTo("填报中");
        assertThat(result.getRound().getCountdownSeconds()).isPositive();
        assertThat(result.getTodo()).extracting(DashboardTodoVO::getType)
                .containsExactly("INTENTION", "INTERVIEW", "CONFIRM");
        assertThat(result.getTodo()).extracting(DashboardTodoVO::getCount)
                .containsExactly(1, 2, 1);
        assertThat(result.getIntentionSummary().getStatus()).isEqualTo(1);
        assertThat(result.getIntentionSummary().getItems()).hasSize(1);
        assertThat(result.getIntentionSummary().getItems().get(0).getMentorId()).isEqualTo(11L);
        assertThat(result.getUnreadNoticeCount()).isEqualTo(3);
    }

    /**
     * 边界：意向已提交且无面试与待确认时，待办为空。
     */
    @Test
    void getStudentDashboard_submittedIntention_shouldOmitZeroTodo() {
        when(selectionRoundMapper.selectOne(any())).thenReturn(round(3, LocalDateTime.now().plusHours(1)));
        when(intentionMapper.selectOne(any())).thenReturn(intention(2));
        when(intentionItemMapper.selectList(any())).thenReturn(List.of(intentionItem(11L, 1L)));
        when(interviewScheduleMapper.selectCount(any())).thenReturn(0L);
        when(admissionMapper.selectCount(any())).thenReturn(0L);
        when(userNoticeMapper.selectCount(any())).thenReturn(0L);

        StudentDashboardVO result = dashboardService.getStudentDashboard(1001L);

        assertThat(result.getTodo()).isEmpty();
        assertThat(result.getIntentionSummary().getStatus()).isEqualTo(2);
        assertThat(result.getUnreadNoticeCount()).isZero();
    }

    /**
     * 边界：未配置当前轮次时返回空工作台而不是抛异常。
     */
    @Test
    void getStudentDashboard_noCurrentRound_shouldReturnEmptyDashboard() {
        when(selectionRoundMapper.selectOne(any())).thenReturn(null);

        StudentDashboardVO result = dashboardService.getStudentDashboard(1001L);

        assertThat(result.getRound()).isNull();
        assertThat(result.getTodo()).isEmpty();
        assertThat(result.getIntentionSummary()).isNull();
        assertThat(result.getUnreadNoticeCount()).isZero();
    }

    /**
     * 盲选门禁：填报截止前导师不可见报名人数。
     */
    @Test
    void getTeacherDashboard_beforeApplyEnd_shouldHideApplicantCount() {
        when(selectionRoundMapper.selectOne(any())).thenReturn(round(2, LocalDateTime.now().plusHours(1)));
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentorProfile(11L, 1L, 4, 2));
        when(mentorProfileMapper.selectById(any())).thenReturn(mentorProfile(11L, 1L, 4, 2));

        TeacherDashboardVO result = dashboardService.getTeacherDashboard(2001L);

        assertThat(result.getQuota()).isEqualTo(4);
        assertThat(result.getQuotaUsed()).isEqualTo(2);
        assertThat(result.getRemainQuota()).isEqualTo(2);
        assertThat(result.getApplicantCount()).isZero();
        assertThat(result.getApplicantVisible()).isZero();
        verify(intentionItemMapper, never()).selectCount(any());
    }

    /**
     * 快乐路径：填报截止后导师可见报名人数与待办数量。
     */
    @Test
    void getTeacherDashboard_afterApplyEnd_shouldAggregateCounts() {
        when(selectionRoundMapper.selectOne(any())).thenReturn(round(3, LocalDateTime.now().minusHours(1)));
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentorProfile(11L, 1L, 4, 2));
        when(mentorProfileMapper.selectById(any())).thenReturn(mentorProfile(11L, 1L, 4, 2));
        when(intentionItemMapper.selectCount(any())).thenReturn(12L);
        when(interviewScoreMapper.selectCount(any())).thenReturn(5L);
        when(nominationMapper.selectCount(any())).thenReturn(1L);
        when(waitlistMapper.selectCount(any())).thenReturn(0L);

        TeacherDashboardVO result = dashboardService.getTeacherDashboard(2001L);

        assertThat(result.getApplicantCount()).isEqualTo(12);
        assertThat(result.getApplicantVisible()).isEqualTo(1);
        assertThat(result.getPendingScoreCount()).isEqualTo(5);
        assertThat(result.getPendingNomination()).isEqualTo(1);
        assertThat(result.getPendingWaitlistAdjust()).isZero();
        assertThat(result.getRound().getStatusText()).isEqualTo("面试中");
    }

    /**
     * 边界：教师账号未建立导师档案返回 404001。
     */
    @Test
    void getTeacherDashboard_missingMentorProfile_shouldThrow404001() {
        when(selectionRoundMapper.selectOne(any())).thenReturn(round(2, LocalDateTime.now().plusHours(1)));
        when(mentorProfileMapper.selectOne(any())).thenReturn(null);
        when(mentorProfileMapper.selectById(any())).thenReturn(null);

        BusinessException exception = catchThrowableOfType(
                () -> dashboardService.getTeacherDashboard(2001L), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(404001);
    }

    /**
     * 盲选门禁：填报截止前负责人只能拿到 0 人的本室报名聚合。
     */
    @Test
    void getLeaderDashboard_beforeApplyEnd_shouldReturnZeroApplicant() {
        when(selectionRoundMapper.selectOne(any())).thenReturn(round(2, LocalDateTime.now().plusHours(1)));
        when(labMapper.selectOne(any())).thenReturn(lab(1L, 2001L, 20));
        when(labMapper.selectById(any())).thenReturn(lab(1L, 2001L, 20));
        when(mentorProfileMapper.selectList(any())).thenReturn(List.of(
                mentorProfile(11L, 1L, 4, 2), mentorProfile(12L, 1L, 6, 3)));

        LeaderDashboardVO result = dashboardService.getLeaderDashboard(2001L);

        assertThat(result.getApplicantCount()).isZero();
        verify(intentionItemMapper, never()).selectCount(any());
    }

    /**
     * 快乐路径：负责人工作台按本室汇总名额、报名与待办。
     */
    @Test
    void getLeaderDashboard_shouldAggregateLabQuotaAndTodo() {
        when(selectionRoundMapper.selectOne(any())).thenReturn(round(3, LocalDateTime.now().minusHours(1)));
        when(labMapper.selectOne(any())).thenReturn(lab(1L, 2001L, 20));
        when(labMapper.selectById(any())).thenReturn(lab(1L, 2001L, 20));
        when(mentorProfileMapper.selectList(any())).thenReturn(List.of(
                mentorProfile(11L, 1L, 4, 2), mentorProfile(12L, 1L, 6, 3)));
        when(intentionItemMapper.selectCount(any())).thenReturn(56L);
        when(interviewScoreMapper.selectCount(any())).thenReturn(18L);
        when(interviewSessionMapper.selectCount(any())).thenReturn(2L);

        LeaderDashboardVO result = dashboardService.getLeaderDashboard(2001L);

        assertThat(result.getMentorCount()).isEqualTo(2);
        assertThat(result.getTotalQuota()).isEqualTo(10);
        assertThat(result.getQuotaUsed()).isEqualTo(5);
        assertThat(result.getRemainQuota()).isEqualTo(5);
        assertThat(result.getApplicantCount()).isEqualTo(56);
        assertThat(result.getPendingScoreCount()).isEqualTo(18);
        assertThat(result.getTodo()).extracting(DashboardTodoVO::getType).containsExactly("SCORE");
        assertThat(result.getTodo().get(0).getText()).contains("18");
    }

    /**
     * 边界：负责人未绑定实训室返回 403001。
     */
    @Test
    void getLeaderDashboard_missingLab_shouldThrow403001() {
        when(selectionRoundMapper.selectOne(any())).thenReturn(round(3, LocalDateTime.now().minusHours(1)));
        when(labMapper.selectOne(any())).thenReturn(null);
        when(labMapper.selectById(any())).thenReturn(null);

        BusinessException exception = catchThrowableOfType(
                () -> dashboardService.getLeaderDashboard(2001L), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(403001);
    }

    /**
     * 快乐路径：管理员工作台汇总全院账号、名额与待办。
     */
    @Test
    void getAdminDashboard_shouldAggregateOverview() {
        when(selectionRoundMapper.selectOne(any())).thenReturn(round(2, LocalDateTime.now().plusHours(2)));
        when(labMapper.selectList(any())).thenReturn(List.of(
                lab(1L, 2001L, 20), lab(2L, 2002L, 15), lab(3L, 2003L, 10)));
        when(mentorProfileMapper.selectList(any())).thenReturn(List.of(
                mentorProfile(11L, 1L, 4, 2), mentorProfile(12L, 1L, 6, 3)));
        when(sysUserMapper.selectCount(any())).thenReturn(120L);
        when(disputeMapper.selectCount(any())).thenReturn(4L);
        when(publicityMapper.selectCount(any())).thenReturn(1L);

        AdminDashboardVO result = dashboardService.getAdminDashboard();

        assertThat(result.getLabCount()).isEqualTo(3);
        assertThat(result.getMentorCount()).isEqualTo(2);
        assertThat(result.getStudentCount()).isEqualTo(120);
        assertThat(result.getTotalQuota()).isEqualTo(45);
        assertThat(result.getQuotaUsed()).isEqualTo(5);
        assertThat(result.getRemainQuota()).isEqualTo(40);
        assertThat(result.getRound().getStatusText()).isEqualTo("填报中");
        assertThat(result.getTodo()).extracting(DashboardTodoVO::getType)
                .containsExactly("DISPUTE", "PUBLICITY");
        assertThat(result.getTodo()).extracting(DashboardTodoVO::getCount)
                .containsExactly(4, 1);
    }

    private SelectionRound round(int status, LocalDateTime applyEnd) {
        SelectionRound round = new SelectionRound();
        round.setId(1L);
        round.setRoundNo(1);
        round.setRoundName("第一轮双选");
        round.setStatus(status);
        round.setApplyStart(LocalDateTime.now().minusDays(1));
        round.setApplyEnd(applyEnd);
        round.setLocked(0);
        return round;
    }

    private Intention intention(int status) {
        Intention intention = new Intention();
        intention.setId(501L);
        intention.setRoundId(1L);
        intention.setStudentId(1001L);
        intention.setStatus(status);
        intention.setAcceptInnerAdjust(1);
        intention.setAcceptCrossAdjust(0);
        intention.setPoolConsent(0);
        return intention;
    }

    private IntentionItem intentionItem(Long mentorId, Long labId) {
        IntentionItem item = new IntentionItem();
        item.setIntentionId(501L);
        item.setMentorId(mentorId);
        item.setLabId(labId);
        return item;
    }

    private MentorProfile mentorProfile(Long id, Long labId, int quota, int quotaUsed) {
        MentorProfile profile = new MentorProfile();
        profile.setId(id);
        profile.setUserId(2000L + id);
        profile.setLabId(labId);
        profile.setQuota(quota);
        profile.setQuotaUsed(quotaUsed);
        profile.setStatus(1);
        return profile;
    }

    private Lab lab(Long id, Long leaderId, int totalQuota) {
        Lab lab = new Lab();
        lab.setId(id);
        lab.setLeaderId(leaderId);
        lab.setTotalQuota(totalQuota);
        lab.setStatus(1);
        return lab;
    }
}
