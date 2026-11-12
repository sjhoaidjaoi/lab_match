package com.college.labselect.service;

import com.college.labselect.dto.req.SupplementDirectAdmitReqDTO;
import com.college.labselect.dto.req.TakeReallocationReqDTO;
import com.college.labselect.dto.resp.ReallocationPoolVO;
import com.college.labselect.dto.resp.SupplementDirectAdmitRespVO;
import com.college.labselect.entity.Admission;
import com.college.labselect.entity.Intention;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.OperationLog;
import com.college.labselect.entity.Reallocation;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.entity.StudentProfile;
import com.college.labselect.entity.SysUser;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.AdmissionMapper;
import com.college.labselect.mapper.IntentionItemMapper;
import com.college.labselect.mapper.IntentionMapper;
import com.college.labselect.mapper.LabMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.OperationLogMapper;
import com.college.labselect.mapper.ReallocationMapper;
import com.college.labselect.mapper.SelectionRoundMapper;
import com.college.labselect.mapper.StudentProfileMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.mapper.UserNoticeMapper;
import com.college.labselect.service.impl.SupplementServiceImpl;
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
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 补录与跨室调剂池服务单元测试，阶段 3 以红灯作为阶段 4 的编码边界。
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SupplementServiceTest {

    @Mock
    private SelectionRoundMapper selectionRoundMapper;

    @Mock
    private AdmissionMapper admissionMapper;

    @Mock
    private MentorProfileMapper mentorProfileMapper;

    @Mock
    private IntentionMapper intentionMapper;

    @Mock
    private IntentionItemMapper intentionItemMapper;

    @Mock
    private StudentProfileMapper studentProfileMapper;

    @Mock
    private ReallocationMapper reallocationMapper;

    @Mock
    private OperationLogMapper operationLogMapper;

    @Mock
    private LabMapper labMapper;

    @Mock
    private SysUserMapper sysUserMapper;

    @Mock
    private UserNoticeMapper userNoticeMapper;

    @InjectMocks
    private SupplementServiceImpl supplementService;

    /**
     * 边界：已有录取去向的学生访问补录导师列表返回 403001。
     */
    @Test
    void listSupplementMentors_confirmedStudent_shouldThrow403001() {
        when(selectionRoundMapper.selectOne(any())).thenReturn(round(2, 1, false));
        when(admissionMapper.selectCount(any())).thenReturn(1L);

        BusinessException exception = catchThrowableOfType(
                () -> supplementService.listSupplementMentors(1001L), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(403001);
    }

    /**
     * 边界：不在调剂时间窗内抢录返回 400004。
     */
    @Test
    void take_outsideAdjustWindow_shouldThrow400004() {
        SelectionRound round = round(1, 1, true);
        round.setAdjustStart(LocalDateTime.now().plusHours(2));
        round.setAdjustEnd(LocalDateTime.now().plusHours(4));
        when(selectionRoundMapper.selectOne(any())).thenReturn(round);
        when(selectionRoundMapper.selectById(1L)).thenReturn(round);
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor(11L, 4, 2));

        BusinessException exception = catchThrowableOfType(
                () -> supplementService.take(2001L, 1001L, takeReq()), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400004);
    }

    /**
     * 边界：学生已被其他实训室录入返回 409001。
     */
    @Test
    void take_alreadyTaken_shouldThrow409001() {
        stubOpenRound();
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor(11L, 4, 2));
        when(intentionMapper.selectOne(any())).thenReturn(intention());
        when(admissionMapper.selectCount(any())).thenReturn(1L);

        BusinessException exception = catchThrowableOfType(
                () -> supplementService.take(2001L, 1001L, takeReq()), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(409001);
    }

    /**
     * 边界：学生未进入全院调剂池返回 400002。
     */
    @Test
    void take_notInPool_shouldThrow400002() {
        stubOpenRound();
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor(11L, 4, 2));
        when(intentionMapper.selectOne(any())).thenReturn(null);

        BusinessException exception = catchThrowableOfType(
                () -> supplementService.take(2001L, 1001L, takeReq()), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400002);
    }

    /**
     * 边界：学生已放弃调剂结果退出调剂池，不可再次抢录。
     */
    @Test
    void take_exitedPool_shouldThrow400005() {
        stubOpenRound();
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor(11L, 4, 2));
        when(intentionMapper.selectOne(any())).thenReturn(intention());
        Admission abandoned = new Admission();
        abandoned.setRoundId(1L);
        abandoned.setStudentId(1001L);
        abandoned.setStatus(4);
        when(admissionMapper.selectList(any())).thenReturn(List.of(abandoned));

        BusinessException exception = catchThrowableOfType(
                () -> supplementService.take(2001L, 1001L, takeReq()), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400005);
    }

    /**
     * 边界：个人剩余名额不足返回 400002。
     */
    @Test
    void take_noQuota_shouldThrow400002() {
        stubOpenRound();
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor(11L, 4, 4));
        when(intentionMapper.selectOne(any())).thenReturn(intention());
        when(admissionMapper.selectCount(any())).thenReturn(0L);

        BusinessException exception = catchThrowableOfType(
                () -> supplementService.take(2001L, 1001L, takeReq()), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400002);
    }

    /**
     * 快乐路径：抢录成功直接写入已确认录取、调剂记录与操作日志。
     */
    @Test
    void take_success_shouldWriteConfirmedAdmission() {
        stubOpenRound();
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor(11L, 4, 2));
        when(mentorProfileMapper.selectById(11L)).thenReturn(mentor(11L, 4, 2));
        when(mentorProfileMapper.update(isNull(), any())).thenReturn(1);
        when(intentionMapper.selectOne(any())).thenReturn(intention());
        when(admissionMapper.selectCount(any())).thenReturn(0L);

        supplementService.take(2001L, 1001L, takeReq());

        verify(reallocationMapper, atLeastOnce()).insert(any(Reallocation.class));
        verify(admissionMapper, atLeastOnce()).insert(any(Admission.class));
        verify(operationLogMapper, atLeastOnce()).insert(any(OperationLog.class));
    }

    /**
     * 边界：首轮不支持直接录入返回 400005。
     */
    @Test
    void directAdmit_firstRound_shouldThrow400005() {
        when(selectionRoundMapper.selectById(1L)).thenReturn(round(1, 1, false));
        when(selectionRoundMapper.selectOne(any())).thenReturn(round(1, 1, false));

        BusinessException exception = catchThrowableOfType(
                () -> supplementService.directAdmit(2001L, admitReq()), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400005);
    }

    /**
     * 边界：学生未将当前导师列为补录意向返回 400005。
     */
    @Test
    void directAdmit_notIntended_shouldThrow400005() {
        when(selectionRoundMapper.selectById(1L)).thenReturn(round(2, 2, false));
        when(selectionRoundMapper.selectOne(any())).thenReturn(round(2, 2, false));
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor(11L, 4, 2));
        when(intentionItemMapper.selectCount(any())).thenReturn(0L);

        BusinessException exception = catchThrowableOfType(
                () -> supplementService.directAdmit(2001L, admitReq()), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400005);
    }

    /**
     * 边界：补录意愿仍为草稿未提交返回 400005。
     */
    @Test
    void directAdmit_draftIntention_shouldThrow400005() {
        when(selectionRoundMapper.selectById(1L)).thenReturn(round(2, 2, false));
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor(11L, 4, 2));
        Intention draft = intention();
        draft.setStatus(1);
        when(intentionMapper.selectOne(any())).thenReturn(draft);

        BusinessException exception = catchThrowableOfType(
                () -> supplementService.directAdmit(2001L, admitReq()), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400005);
    }

    /**
     * 边界：个人剩余名额不足返回 400002。
     */
    @Test
    void directAdmit_noQuota_shouldThrow400002() {
        when(selectionRoundMapper.selectById(1L)).thenReturn(round(2, 2, false));
        when(selectionRoundMapper.selectOne(any())).thenReturn(round(2, 2, false));
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor(11L, 4, 4));
        when(intentionMapper.selectOne(any())).thenReturn(intention());
        when(intentionItemMapper.selectCount(any())).thenReturn(1L);
        when(admissionMapper.selectCount(any())).thenReturn(0L);

        BusinessException exception = catchThrowableOfType(
                () -> supplementService.directAdmit(2001L, admitReq()), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400002);
    }

    /**
     * 快乐路径：调剂池返回服从跨室调剂的学生与档案摘要。
     */
    @Test
    void listTeacherPool_shouldReturnCrossAdjustStudents() {
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor(11L, 4, 2));
        when(selectionRoundMapper.selectById(1L)).thenReturn(round(2, 2, true));
        when(intentionMapper.selectList(any())).thenReturn(List.of(intention()));
        when(admissionMapper.selectList(any())).thenReturn(List.of());
        when(sysUserMapper.selectBatchIds(any())).thenReturn(List.of(student()));
        when(studentProfileMapper.selectList(any())).thenReturn(List.of(profile()));

        ReallocationPoolVO result = supplementService.listTeacherPool(2001L, 1L, null, 1, 10);

        assertThat(result.getTotal()).isEqualTo(1);
        assertThat(result.getMyRemainQuota()).isEqualTo(2);
        assertThat(result.getList().get(0).getHasFullArchive()).isEqualTo(1);
        assertThat(result.getList().get(0).getStatementSummary()).hasSize(80);
        assertThat(result.getList().get(0).getTaken()).isZero();
    }

    /**
     * 快乐路径：补录直录写入已确认录取与操作日志。
     */
    @Test
    void directAdmit_success_shouldInsertConfirmedAdmission() {
        when(selectionRoundMapper.selectById(1L)).thenReturn(round(2, 2, false));
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor(11L, 4, 2));
        when(intentionMapper.selectOne(any())).thenReturn(intention());
        when(intentionItemMapper.selectCount(any())).thenReturn(1L);
        when(admissionMapper.selectCount(any())).thenReturn(0L);
        when(mentorProfileMapper.update(isNull(), any())).thenReturn(1);
        when(admissionMapper.insert(any(Admission.class))).thenAnswer(invocation -> {
            Admission admission = invocation.getArgument(0);
            admission.setId(904L);
            return 1;
        });

        SupplementDirectAdmitRespVO result = supplementService.directAdmit(2001L, admitReq());

        assertThat(result.getAdmissionId()).isEqualTo(904L);
        assertThat(result.getStatus()).isEqualTo(2);
        verify(admissionMapper, atLeastOnce()).insert(any(Admission.class));
        verify(operationLogMapper, atLeastOnce()).insert(any(OperationLog.class));
        verify(userNoticeMapper, atLeastOnce()).insert(any(com.college.labselect.entity.UserNotice.class));
    }

    private void stubOpenRound() {
        SelectionRound round = round(1, 1, true);
        when(selectionRoundMapper.selectById(1L)).thenReturn(round);
        when(selectionRoundMapper.selectOne(any())).thenReturn(round);
    }

    private SelectionRound round(int roundNo, int status, boolean adjustOpen) {
        SelectionRound round = new SelectionRound();
        round.setId(1L);
        round.setRoundNo(roundNo);
        round.setStatus(status);
        round.setLocked(0);
        round.setApplyStart(LocalDateTime.now().minusDays(1));
        round.setApplyEnd(LocalDateTime.now().minusHours(6));
        round.setAdjustStart(adjustOpen ? LocalDateTime.now().minusHours(2) : LocalDateTime.now().plusHours(2));
        round.setAdjustEnd(adjustOpen ? LocalDateTime.now().plusHours(2) : LocalDateTime.now().plusHours(4));
        return round;
    }

    private MentorProfile mentor(Long id, int quota, int quotaUsed) {
        MentorProfile mentor = new MentorProfile();
        mentor.setId(id);
        mentor.setUserId(2001L);
        mentor.setLabId(1L);
        mentor.setQuota(quota);
        mentor.setQuotaUsed(quotaUsed);
        mentor.setStatus(1);
        return mentor;
    }

    private Intention intention() {
        Intention intention = new Intention();
        intention.setId(501L);
        intention.setRoundId(1L);
        intention.setStudentId(1001L);
        intention.setAcceptCrossAdjust(1);
        intention.setPoolConsent(1);
        intention.setStatus(2);
        return intention;
    }

    private SysUser student() {
        SysUser user = new SysUser();
        user.setId(1001L);
        user.setUserNo("20220001");
        user.setRealName("陈爱丽");
        user.setCollege("计算机学院");
        user.setMajor("软件工程");
        user.setGrade("2022");
        return user;
    }

    private StudentProfile profile() {
        StudentProfile profile = new StudentProfile();
        profile.setUserId(1001L);
        profile.setStatement("我".repeat(120));
        profile.setProgrammingLanguages("Java,Python");
        profile.setWeeklyHours(12);
        return profile;
    }

    private TakeReallocationReqDTO takeReq() {
        TakeReallocationReqDTO req = new TakeReallocationReqDTO();
        req.setReason("学生项目经历与方向高度匹配");
        return req;
    }

    private SupplementDirectAdmitReqDTO admitReq() {
        SupplementDirectAdmitReqDTO req = new SupplementDirectAdmitReqDTO();
        req.setRoundId(1L);
        req.setStudentId(1001L);
        req.setReason("补录轮免面试直接录入");
        return req;
    }
}
