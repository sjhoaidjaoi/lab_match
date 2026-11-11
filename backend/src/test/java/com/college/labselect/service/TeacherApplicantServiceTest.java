package com.college.labselect.service;

import com.college.labselect.dto.resp.TeacherApplicantPageVO;
import com.college.labselect.dto.resp.TeacherStudentArchiveVO;
import com.college.labselect.entity.Admission;
import com.college.labselect.entity.Intention;
import com.college.labselect.entity.IntentionItem;
import com.college.labselect.entity.InterviewScore;
import com.college.labselect.entity.InterviewSchedule;
import com.college.labselect.entity.InterviewSession;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.entity.StudentProfile;
import com.college.labselect.entity.SysUser;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.AdmissionMapper;
import com.college.labselect.mapper.IntentionItemMapper;
import com.college.labselect.mapper.IntentionMapper;
import com.college.labselect.mapper.InterviewScoreMapper;
import com.college.labselect.mapper.InterviewScheduleMapper;
import com.college.labselect.mapper.InterviewSessionMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.SelectionRoundMapper;
import com.college.labselect.mapper.StudentProfileMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.service.impl.TeacherApplicantServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 导师报名学生服务单元测试。
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TeacherApplicantServiceTest {

    @Mock
    private SelectionRoundMapper selectionRoundMapper;

    @Mock
    private MentorProfileMapper mentorProfileMapper;

    @Mock
    private IntentionMapper intentionMapper;

    @Mock
    private IntentionItemMapper intentionItemMapper;

    @Mock
    private SysUserMapper sysUserMapper;

    @Mock
    private InterviewScheduleMapper interviewScheduleMapper;

    @Mock
    private InterviewSessionMapper interviewSessionMapper;

    @Mock
    private InterviewScoreMapper interviewScoreMapper;

    @Mock
    private AdmissionMapper admissionMapper;

    @Mock
    private StudentProfileMapper studentProfileMapper;

    @InjectMocks
    private TeacherApplicantServiceImpl teacherApplicantService;

    /**
     * 边界：填报截止前盲选门禁，返回不可见且不查询意向。
     */
    @Test
    void listApplicants_beforeApplyEnd_shouldHideList() {
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor());
        when(selectionRoundMapper.selectOne(any())).thenReturn(round(LocalDateTime.now().plusHours(1)));

        TeacherApplicantPageVO result = teacherApplicantService.listApplicants(2001L, null, null, null, 1, 10);

        assertThat(result.getVisible()).isZero();
        assertThat(result.getList()).isEmpty();
        verify(intentionMapper, never()).selectList(any());
    }

    /**
     * 快乐路径：截止后返回本人意向学生，学号姓名脱敏并带出面试与评分信息。
     */
    @Test
    void listApplicants_afterApplyEnd_shouldReturnMaskedApplicants() {
        stubApplicants();
        when(interviewScheduleMapper.selectList(any())).thenReturn(List.of(schedule(2)));
        when(interviewSessionMapper.selectBatchIds(any())).thenReturn(List.of(session()));
        when(interviewScoreMapper.selectList(any())).thenReturn(List.of(score(2)));
        when(admissionMapper.selectList(any())).thenReturn(List.of(admission()));

        TeacherApplicantPageVO result = teacherApplicantService.listApplicants(2001L, null, null, null, 1, 10);

        assertThat(result.getVisible()).isEqualTo(1);
        assertThat(result.getTotal()).isEqualTo(1);
        assertThat(result.getList().get(0).getStudentNo()).isEqualTo("2022****01");
        assertThat(result.getList().get(0).getStudentName()).isEqualTo("陈*丽");
        assertThat(result.getList().get(0).getSessionName()).isEqualTo("第一场");
        assertThat(result.getList().get(0).getInterviewDate()).isEqualTo(LocalDate.of(2026, 11, 2));
        assertThat(result.getList().get(0).getTotalScore()).isEqualByComparingTo("85.75");
        assertThat(result.getList().get(0).getScoreStatusText()).isEqualTo("已提交");
        assertThat(result.getList().get(0).getAdmissionStatusText()).isEqualTo("待确认");
    }

    /**
     * 边界：按评分状态筛选无匹配时返回空列表。
     */
    @Test
    void listApplicants_scoreStatusMismatch_shouldReturnEmpty() {
        stubApplicants();
        when(interviewScoreMapper.selectList(any())).thenReturn(List.of(score(1)));

        TeacherApplicantPageVO result = teacherApplicantService.listApplicants(2001L, null, 2, null, 1, 10);

        assertThat(result.getVisible()).isEqualTo(1);
        assertThat(result.getTotal()).isZero();
    }

    /**
     * 边界：教师未建立导师档案返回 404001。
     */
    @Test
    void listApplicants_missingMentor_shouldThrow404001() {
        when(mentorProfileMapper.selectOne(any())).thenReturn(null);

        BusinessException exception = catchThrowableOfType(
                () -> teacherApplicantService.listApplicants(2001L, null, null, null, 1, 10),
                BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(404001);
    }

    /**
     * 边界：填报截止前导师查看档案返回 403001。
     */
    @Test
    void getStudentArchive_beforeApplyEnd_shouldThrow403001() {
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor());
        when(selectionRoundMapper.selectOne(any())).thenReturn(round(LocalDateTime.now().plusHours(1)));

        BusinessException exception = catchThrowableOfType(
                () -> teacherApplicantService.getStudentArchive(2001L, 1001L), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(403001);
    }

    /**
     * 边界：学生未将当前导师列为意向返回 403001。
     */
    @Test
    void getStudentArchive_notIntended_shouldThrow403001() {
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor());
        when(selectionRoundMapper.selectOne(any())).thenReturn(round(LocalDateTime.now().minusHours(1)));
        when(intentionMapper.selectOne(any())).thenReturn(null);

        BusinessException exception = catchThrowableOfType(
                () -> teacherApplicantService.getStudentArchive(2001L, 1001L), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(403001);
    }

    /**
     * 快乐路径：导师查看意向学生档案返回脱敏信息且不含缺失项。
     */
    @Test
    void getStudentArchive_success_shouldReturnMaskedArchive() {
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor());
        when(selectionRoundMapper.selectOne(any())).thenReturn(round(LocalDateTime.now().minusHours(1)));
        when(intentionMapper.selectOne(any())).thenReturn(intention());
        when(intentionItemMapper.selectCount(any())).thenReturn(1L);
        when(sysUserMapper.selectById(1001L)).thenReturn(student());
        when(studentProfileMapper.selectOne(any())).thenReturn(profile());

        TeacherStudentArchiveVO result = teacherApplicantService.getStudentArchive(2001L, 1001L);

        assertThat(result.getUserNo()).isEqualTo("2022****01");
        assertThat(result.getRealName()).isEqualTo("陈*丽");
        assertThat(result.getProgrammingLanguages()).containsExactly("Java", "Python");
        assertThat(result.getStatement()).hasSize(320);
    }

    /**
     * 边界：学生未创建档案时返回 null。
     */
    @Test
    void getStudentArchive_noProfile_shouldReturnNull() {
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor());
        when(selectionRoundMapper.selectOne(any())).thenReturn(round(LocalDateTime.now().minusHours(1)));
        when(intentionMapper.selectOne(any())).thenReturn(intention());
        when(intentionItemMapper.selectCount(any())).thenReturn(1L);
        when(sysUserMapper.selectById(1001L)).thenReturn(student());
        when(studentProfileMapper.selectOne(any())).thenReturn(null);

        TeacherStudentArchiveVO result = teacherApplicantService.getStudentArchive(2001L, 1001L);

        assertThat(result).isNull();
    }

    private void stubApplicants() {
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor());
        when(selectionRoundMapper.selectOne(any())).thenReturn(round(LocalDateTime.now().minusHours(1)));
        when(intentionMapper.selectList(any())).thenReturn(List.of(intention()));
        when(intentionItemMapper.selectList(any())).thenReturn(List.of(intentionItem()));
        when(sysUserMapper.selectBatchIds(any())).thenReturn(List.of(student()));
    }

    private SelectionRound round(LocalDateTime applyEnd) {
        SelectionRound round = new SelectionRound();
        round.setId(1L);
        round.setRoundNo(1);
        round.setRoundName("第一轮双选");
        round.setStatus(3);
        round.setApplyStart(LocalDateTime.now().minusDays(2));
        round.setApplyEnd(applyEnd);
        round.setLocked(0);
        return round;
    }

    private MentorProfile mentor() {
        MentorProfile mentor = new MentorProfile();
        mentor.setId(11L);
        mentor.setUserId(2001L);
        mentor.setLabId(1L);
        mentor.setQuota(4);
        mentor.setQuotaUsed(2);
        mentor.setStatus(1);
        return mentor;
    }

    private Intention intention() {
        Intention intention = new Intention();
        intention.setId(501L);
        intention.setRoundId(1L);
        intention.setStudentId(1001L);
        intention.setStatus(2);
        return intention;
    }

    private IntentionItem intentionItem() {
        IntentionItem item = new IntentionItem();
        item.setId(601L);
        item.setIntentionId(501L);
        item.setMentorId(11L);
        item.setLabId(1L);
        return item;
    }

    private SysUser student() {
        SysUser user = new SysUser();
        user.setId(1001L);
        user.setUserNo("20220001");
        user.setRealName("陈爱丽");
        user.setUserType(1);
        user.setCollege("计算机学院");
        user.setMajor("软件工程");
        user.setGrade("2022");
        return user;
    }

    private StudentProfile profile() {
        StudentProfile profile = new StudentProfile();
        profile.setId(1L);
        profile.setUserId(1001L);
        profile.setProgrammingLanguages("Java,Python");
        profile.setProjectExperience("主导过校园二手交易平台后端开发");
        profile.setWeeklyHours(12);
        profile.setAvailableSlots("工作日 19:00-22:00");
        profile.setStatement("我".repeat(320));
        return profile;
    }

    private InterviewSchedule schedule(int status) {
        InterviewSchedule schedule = new InterviewSchedule();
        schedule.setId(1L);
        schedule.setRoundId(1L);
        schedule.setLabId(1L);
        schedule.setSessionId(3L);
        schedule.setStudentId(1001L);
        schedule.setStatus(status);
        return schedule;
    }

    private InterviewSession session() {
        InterviewSession session = new InterviewSession();
        session.setId(3L);
        session.setSessionName("第一场");
        session.setInterviewDate(LocalDate.of(2026, 11, 2));
        return session;
    }

    private InterviewScore score(int status) {
        InterviewScore score = new InterviewScore();
        score.setId(1L);
        score.setRoundId(1L);
        score.setLabId(1L);
        score.setStudentId(1001L);
        score.setFinalTotal(new BigDecimal("85.75"));
        score.setStatus(status);
        return score;
    }

    private Admission admission() {
        Admission admission = new Admission();
        admission.setId(1L);
        admission.setRoundId(1L);
        admission.setStudentId(1001L);
        admission.setStatus(1);
        return admission;
    }
}
