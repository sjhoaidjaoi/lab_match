package com.college.labselect.service;

import com.college.labselect.dto.req.AdminReallocationItemReqDTO;
import com.college.labselect.dto.req.AdminReallocationReqDTO;
import com.college.labselect.dto.req.AdmissionAdjustReqDTO;
import com.college.labselect.dto.req.LeaderReallocationReqDTO;
import com.college.labselect.dto.resp.AdminReallocationRespVO;
import com.college.labselect.dto.resp.AdmissionAdjustRespVO;
import com.college.labselect.entity.Admission;
import com.college.labselect.entity.Intention;
import com.college.labselect.entity.IntentionItem;
import com.college.labselect.entity.InterviewScore;
import com.college.labselect.entity.Lab;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.OperationLog;
import com.college.labselect.entity.Reallocation;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.entity.SysUser;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.AdmissionMapper;
import com.college.labselect.mapper.IntentionItemMapper;
import com.college.labselect.mapper.IntentionMapper;
import com.college.labselect.mapper.InterviewScoreMapper;
import com.college.labselect.mapper.LabMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.OperationLogMapper;
import com.college.labselect.mapper.ReallocationMapper;
import com.college.labselect.mapper.SelectionRoundMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.mapper.UserNoticeMapper;
import com.college.labselect.service.impl.AdmissionWaitlistSupport;
import com.college.labselect.service.impl.ReallocationServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 统筹调剂与阶段内调整服务单元测试，阶段 3 以红灯作为阶段 4 的编码边界。
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ReallocationServiceTest {

    @Mock
    private ReallocationMapper reallocationMapper;

    @Mock
    private AdmissionMapper admissionMapper;

    @Mock
    private MentorProfileMapper mentorProfileMapper;

    @Mock
    private IntentionMapper intentionMapper;

    @Mock
    private IntentionItemMapper intentionItemMapper;

    @Mock
    private InterviewScoreMapper interviewScoreMapper;

    @Mock
    private SelectionRoundMapper selectionRoundMapper;

    @Mock
    private LabMapper labMapper;

    @Mock
    private SysUserMapper sysUserMapper;

    @Mock
    private OperationLogMapper operationLogMapper;

    @Mock
    private UserNoticeMapper userNoticeMapper;

    @Mock
    private AdmissionWaitlistSupport admissionWaitlistSupport;

    @InjectMocks
    private ReallocationServiceImpl reallocationService;

    /**
     * 边界：调剂级别不在 1-3 范围返回 400001。
     */
    @Test
    void listAdminCandidates_invalidLevel_shouldThrow400001() {
        BusinessException exception = catchThrowableOfType(
                () -> reallocationService.listAdminCandidates(1L, 4, 1, 10), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400001);
    }

    /**
     * 边界：内部调剂未填写说明返回 400001。
     */
    @Test
    void reallocateInner_blankReason_shouldThrow400001() {
        LeaderReallocationReqDTO req = innerReq();
        req.setReason(" ");

        BusinessException exception = catchThrowableOfType(
                () -> reallocationService.reallocateInner(2001L, req), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400001);
    }

    /**
     * 边界：学生未勾选服从内部调剂返回 400002。
     */
    @Test
    void reallocateInner_notAcceptInner_shouldThrow400002() {
        stubInnerRound();
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor(11L, 1L, 5, 2));
        when(intentionMapper.selectOne(any())).thenReturn(intention(0, 1));
        when(intentionItemMapper.selectList(any())).thenReturn(List.of(item(1L)));
        when(admissionMapper.selectCount(any())).thenReturn(0L);

        BusinessException exception = catchThrowableOfType(
                () -> reallocationService.reallocateInner(2001L, innerReq()), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400002);
    }

    /**
     * 边界：负责人给非本室学生调剂返回 403001。
     */
    @Test
    void reallocateInner_otherLab_shouldThrow403001() {
        stubInnerRound();
        when(labMapper.selectOne(any())).thenReturn(lab(2L));
        when(intentionMapper.selectOne(any())).thenReturn(intention(1, 0));
        when(intentionItemMapper.selectList(any())).thenReturn(List.of(item(1L)));
        when(admissionMapper.selectCount(any())).thenReturn(0L);

        BusinessException exception = catchThrowableOfType(
                () -> reallocationService.reallocateInner(2001L, innerReq()), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(403001);
    }

    /**
     * 边界：目标导师名额已满返回 400002。
     */
    @Test
    void reallocateInner_noRemainQuota_shouldThrow400002() {
        stubInnerRound();
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor(11L, 1L, 5, 2));
        when(mentorProfileMapper.selectById(12L)).thenReturn(mentor(12L, 1L, 4, 4));
        when(intentionMapper.selectOne(any())).thenReturn(intention(1, 0));
        when(intentionItemMapper.selectList(any())).thenReturn(List.of(item(1L)));
        when(admissionMapper.selectCount(any())).thenReturn(0L);

        BusinessException exception = catchThrowableOfType(
                () -> reallocationService.reallocateInner(2001L, innerReq()), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400002);
    }

    /**
     * 快乐路径：内部调剂成功同时写入调剂记录、录取记录与操作日志。
     */
    @Test
    void reallocateInner_success_shouldWriteReallocationAndAdmission() {
        stubInnerRound();
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor(11L, 1L, 5, 2));
        when(mentorProfileMapper.selectById(12L)).thenReturn(mentor(12L, 1L, 4, 1));
        when(mentorProfileMapper.update(isNull(), any())).thenReturn(1);
        when(intentionMapper.selectOne(any())).thenReturn(intention(1, 0));
        when(intentionItemMapper.selectList(any())).thenReturn(List.of(item(1L)));
        when(admissionMapper.selectCount(any())).thenReturn(0L);
        when(mentorProfileMapper.increaseQuotaUsed(any(), anyInt())).thenReturn(1);

        reallocationService.reallocateInner(2001L, innerReq());

        verify(reallocationMapper, atLeastOnce()).insert(any(Reallocation.class));
        ArgumentCaptor<Admission> captor = ArgumentCaptor.forClass(Admission.class);
        verify(admissionMapper).insert(captor.capture());
        Admission saved = captor.getValue();
        assertThat(saved.getStatus()).isEqualTo(1);
        assertThat(saved.getPendingType()).isEqualTo(4);
        assertThat(saved.getActiveFlag()).isNull();
        assertThat(saved.getConfirmDeadline()).isNotNull();
        assertThat(saved.getConfirmDeadline()).isBefore(LocalDateTime.now().plusHours(2));
        verify(operationLogMapper, atLeastOnce()).insert(any(OperationLog.class));
    }

    /**
     * 边界：批量调剂允许部分成功，失败明细不中断已成功条目。
     */
    @Test
    void reallocateByAdmin_partialFailure_shouldReturnFailList() {
        stubOpenRound();
        when(intentionMapper.selectOne(any())).thenReturn(intention(0, 1));
        when(admissionMapper.selectCount(any())).thenReturn(0L);
        when(mentorProfileMapper.selectById(12L)).thenReturn(mentor(12L, 1L, 4, 1));
        when(mentorProfileMapper.selectById(13L)).thenReturn(mentor(13L, 1L, 4, 4));
        when(mentorProfileMapper.increaseQuotaUsed(any(), anyInt())).thenReturn(1);

        AdminReallocationReqDTO req = new AdminReallocationReqDTO();
        req.setRoundId(1L);
        req.setLevel(2);
        req.setItems(List.of(adminItem(1001L, 12L), adminItem(1002L, 13L)));
        req.setReason("跨室兜底");

        AdminReallocationRespVO result = reallocationService.reallocateByAdmin(3001L, req);

        assertThat(result.getSuccessCount()).isEqualTo(1);
        assertThat(result.getFailCount()).isEqualTo(1);
        assertThat(result.getFailList()).hasSize(1);
    }

    /**
     * 边界：批次锁定后调整录取返回 400005。
     */
    @Test
    void adjustAdmission_lockedRound_shouldThrow400005() {
        Admission admission = admission(901L, 2);
        when(admissionMapper.selectById(901L)).thenReturn(admission);
        SelectionRound round = openRound();
        round.setLocked(1);
        when(selectionRoundMapper.selectById(1L)).thenReturn(round);
        when(selectionRoundMapper.selectOne(any())).thenReturn(round);

        BusinessException exception = catchThrowableOfType(
                () -> reallocationService.adjustAdmission(3001L, 901L, cancelReq()), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400005);
    }

    /**
     * 快乐路径：取消通过释放名额并写操作日志，不触发递补。
     */
    @Test
    void adjustAdmission_cancel_shouldReleaseQuotaAndLog() {
        Admission admission = admission(901L, 2);
        when(admissionMapper.selectById(901L)).thenReturn(admission);
        when(selectionRoundMapper.selectById(1L)).thenReturn(openRound());
        when(selectionRoundMapper.selectOne(any())).thenReturn(openRound());
        when(mentorProfileMapper.selectById(11L)).thenReturn(mentor(11L, 1L, 4, 2));
        when(mentorProfileMapper.update(isNull(), any())).thenReturn(1);

        AdmissionAdjustRespVO result = reallocationService.adjustAdmission(3001L, 901L, cancelReq());

        assertThat(result.getStatus()).isEqualTo(4);
        verify(admissionMapper, atLeastOnce()).updateById(any(Admission.class));
        verify(operationLogMapper, atLeastOnce()).insert(any(OperationLog.class));
    }

    /**
     * 快乐路径：内部调剂候选仅包含服从内部调剂且本室有名额的学生。
     */
    @Test
    void listAdminCandidates_level1_shouldFilterConsentAndMentors() {
        when(intentionMapper.selectList(any())).thenReturn(List.of(
                intention(501L, 1001L, 1, 0),
                intention(502L, 1002L, 0, 1)));
        when(intentionItemMapper.selectList(any())).thenReturn(List.of(item(1L)));
        when(admissionMapper.selectList(any())).thenReturn(List.of());
        when(mentorProfileMapper.selectList(any())).thenReturn(List.of(
                mentor(11L, 1L, 5, 2), mentor(12L, 2L, 4, 1)));
        when(labMapper.selectBatchIds(any())).thenReturn(List.of(lab(1L), lab(2L)));
        when(sysUserMapper.selectBatchIds(any())).thenReturn(List.of(
                user(1001L, "陈爱丽"), user(1002L, "张伟强"),
                user(2011L, "李海峰"), user(2012L, "王建国")));
        when(interviewScoreMapper.selectList(any())).thenReturn(List.of(score(1001L)));

        var result = reallocationService.listAdminCandidates(1L, 1, 1, 10);

        assertThat(result.getTotal()).isEqualTo(1);
        assertThat(result.getList().get(0).getAvailableMentors()).hasSize(1);
        assertThat(result.getList().get(0).getAvailableMentors().get(0).getMentorId()).isEqualTo(11L);
    }

    /**
     * 边界：座谈安置未填写说明返回 400001。
     */
    @Test
    void reallocateByAdmin_level3WithoutReason_shouldThrow400001() {
        AdminReallocationReqDTO req = new AdminReallocationReqDTO();
        req.setRoundId(1L);
        req.setLevel(3);
        req.setItems(List.of(adminItem(1001L, 12L)));
        req.setReason(null);

        BusinessException exception = catchThrowableOfType(
                () -> reallocationService.reallocateByAdmin(3001L, req), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400001);
    }

    private void stubOpenRound() {
        when(selectionRoundMapper.selectById(1L)).thenReturn(openRound());
        when(selectionRoundMapper.selectOne(any())).thenReturn(openRound());
    }

    /**
     * 阶段 6 内部调剂窗口开启，阶段 7 跨室窗口尚未开始。
     */
    private void stubInnerRound() {
        SelectionRound round = openRound();
        round.setInnerAdjustStart(LocalDateTime.now().minusHours(1));
        round.setInnerAdjustEnd(LocalDateTime.now().plusHours(1));
        round.setAdjustStart(LocalDateTime.now().plusHours(2));
        round.setAdjustEnd(LocalDateTime.now().plusHours(4));
        when(selectionRoundMapper.selectById(1L)).thenReturn(round);
        when(selectionRoundMapper.selectOne(any())).thenReturn(round);
        when(labMapper.selectOne(any())).thenReturn(lab(1L));
    }

    private SelectionRound openRound() {
        SelectionRound round = new SelectionRound();
        round.setId(1L);
        round.setRoundNo(1);
        round.setStatus(6);
        round.setLocked(0);
        round.setAdjustStart(LocalDateTime.now().minusHours(2));
        round.setAdjustEnd(LocalDateTime.now().plusHours(2));
        return round;
    }

    private Intention intention(int acceptInner, int acceptCross) {
        Intention intention = new Intention();
        intention.setId(501L);
        intention.setRoundId(1L);
        intention.setStudentId(1001L);
        intention.setAcceptInnerAdjust(acceptInner);
        intention.setAcceptCrossAdjust(acceptCross);
        intention.setStatus(2);
        return intention;
    }

    private Intention intention(Long id, Long studentId, int acceptInner, int acceptCross) {
        Intention intention = intention(acceptInner, acceptCross);
        intention.setId(id);
        intention.setStudentId(studentId);
        return intention;
    }

    private SysUser user(Long id, String realName) {
        SysUser user = new SysUser();
        user.setId(id);
        user.setUserNo("2022" + id);
        user.setRealName(realName);
        user.setStatus(1);
        return user;
    }

    private Lab lab(Long id) {
        Lab lab = new Lab();
        lab.setId(id);
        lab.setLabName("实训室-" + id);
        return lab;
    }

    private InterviewScore score(Long studentId) {
        InterviewScore score = new InterviewScore();
        score.setStudentId(studentId);
        score.setFinalTotal(new BigDecimal("78.00"));
        return score;
    }

    private IntentionItem item(Long labId) {
        IntentionItem item = new IntentionItem();
        item.setIntentionId(501L);
        item.setMentorId(11L);
        item.setLabId(labId);
        return item;
    }

    private MentorProfile mentor(Long id, Long labId, int quota, int quotaUsed) {
        MentorProfile mentor = new MentorProfile();
        mentor.setId(id);
        mentor.setUserId(2000L + id);
        mentor.setLabId(labId);
        mentor.setQuota(quota);
        mentor.setQuotaUsed(quotaUsed);
        mentor.setStatus(1);
        return mentor;
    }

    private Admission admission(Long id, int status) {
        Admission admission = new Admission();
        admission.setId(id);
        admission.setRoundId(1L);
        admission.setStudentId(1001L);
        admission.setLabId(1L);
        admission.setMentorId(11L);
        admission.setSourceType(3);
        admission.setStatus(status);
        admission.setTotalScore(new BigDecimal("78.00"));
        return admission;
    }

    private LeaderReallocationReqDTO innerReq() {
        LeaderReallocationReqDTO req = new LeaderReallocationReqDTO();
        req.setRoundId(1L);
        req.setStudentId(1001L);
        req.setToMentorId(12L);
        req.setReason("本室内部调剂");
        return req;
    }

    private AdminReallocationItemReqDTO adminItem(Long studentId, Long mentorId) {
        AdminReallocationItemReqDTO item = new AdminReallocationItemReqDTO();
        item.setStudentId(studentId);
        item.setToMentorId(mentorId);
        return item;
    }

    private AdmissionAdjustReqDTO cancelReq() {
        AdmissionAdjustReqDTO req = new AdmissionAdjustReqDTO();
        req.setAction("CANCEL");
        req.setReason("学生申请取消");
        return req;
    }
}
