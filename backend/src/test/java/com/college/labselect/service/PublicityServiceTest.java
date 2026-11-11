package com.college.labselect.service;

import com.college.labselect.dto.req.PublicityCreateReqDTO;
import com.college.labselect.dto.resp.PublicityConfirmRespVO;
import com.college.labselect.dto.resp.PublicityCreateRespVO;
import com.college.labselect.dto.resp.PublicityDetailVO;
import com.college.labselect.entity.Admission;
import com.college.labselect.entity.Lab;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.Notice;
import com.college.labselect.entity.OperationLog;
import com.college.labselect.entity.Publicity;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.entity.SysUser;
import com.college.labselect.entity.UserNotice;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.AdmissionMapper;
import com.college.labselect.mapper.DisputeMapper;
import com.college.labselect.mapper.LabMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.NoticeMapper;
import com.college.labselect.mapper.OperationLogMapper;
import com.college.labselect.mapper.PublicityMapper;
import com.college.labselect.mapper.SelectionRoundMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.mapper.UserNoticeMapper;
import com.college.labselect.service.impl.PublicityServiceImpl;
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
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 公示批次服务单元测试，阶段 3 以红灯作为阶段 4 的编码边界。
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PublicityServiceTest {

    @Mock
    private PublicityMapper publicityMapper;

    @Mock
    private DisputeMapper disputeMapper;

    @Mock
    private AdmissionMapper admissionMapper;

    @Mock
    private SelectionRoundMapper selectionRoundMapper;

    @Mock
    private NoticeMapper noticeMapper;

    @Mock
    private UserNoticeMapper userNoticeMapper;

    @Mock
    private SysUserMapper sysUserMapper;

    @Mock
    private LabMapper labMapper;

    @Mock
    private MentorProfileMapper mentorProfileMapper;

    @Mock
    private OperationLogMapper operationLogMapper;

    @InjectMocks
    private PublicityServiceImpl publicityService;

    /**
     * 边界：存在待确认录取时禁止发起公示，返回 400005。
     */
    @Test
    void createPublicity_pendingAdmission_shouldThrow400005() {
        when(selectionRoundMapper.selectById(1L)).thenReturn(finishedRound());
        when(admissionMapper.selectCount(any())).thenReturn(2L);
        when(publicityMapper.selectCount(any())).thenReturn(0L);

        BusinessException exception = catchThrowableOfType(
                () -> publicityService.createPublicity(9001L, createReq()), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400005);
    }

    /**
     * 边界：已有进行中的公示批次时返回 409001。
     */
    @Test
    void createPublicity_activeExists_shouldThrow409001() {
        when(selectionRoundMapper.selectById(1L)).thenReturn(finishedRound());
        when(admissionMapper.selectCount(any())).thenReturn(0L);
        when(publicityMapper.selectCount(any())).thenReturn(1L);

        BusinessException exception = catchThrowableOfType(
                () -> publicityService.createPublicity(9001L, createReq()), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(409001);
    }

    /**
     * 快乐路径：发起公示同时写公示批次、公示公告与全体学生站内通知。
     */
    @Test
    void createPublicity_success_shouldWritePublicityNoticeAndUserNotice() {
        when(selectionRoundMapper.selectById(1L)).thenReturn(finishedRound());
        when(admissionMapper.selectCount(any())).thenReturn(0L);
        when(publicityMapper.selectCount(any())).thenReturn(0L);
        when(admissionMapper.selectList(any())).thenReturn(List.of(admission(1001L, 1001L, 2),
                admission(1002L, 1001L, 2)));

        PublicityCreateRespVO result = publicityService.createPublicity(9001L, createReq());

        assertThat(result.getAdmissionCount()).isEqualTo(2);
        assertThat(result.getStatus()).isEqualTo(1);
        verify(publicityMapper, atLeastOnce()).insert(any(Publicity.class));
        verify(noticeMapper, atLeastOnce()).insert(any(Notice.class));
        verify(userNoticeMapper, atLeastOnce()).insert(any(UserNotice.class));
    }

    /**
     * 边界：公示未结束时不能确认最终名单，返回 400005。
     */
    @Test
    void confirmFinal_notEnded_shouldThrow400005() {
        Publicity publicity = publicity(1301L, 1);
        when(publicityMapper.selectById(1301L)).thenReturn(publicity);

        BusinessException exception = catchThrowableOfType(
                () -> publicityService.confirmFinal(9001L, 1301L), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400005);
    }

    /**
     * 边界：存在未处理异议时禁止确认最终名单，返回 400005。
     */
    @Test
    void confirmFinal_pendingDisputes_shouldThrow400005() {
        when(publicityMapper.selectById(1301L)).thenReturn(publicity(1301L, 2));
        when(disputeMapper.selectCount(any())).thenReturn(2L);

        BusinessException exception = catchThrowableOfType(
                () -> publicityService.confirmFinal(9001L, 1301L), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400005);
    }

    /**
     * 快乐路径：确认最终名单批量置已入组、更新公示状态并写操作日志与入组通知。
     */
    @Test
    void confirmFinal_success_shouldUpdateAdmissionAndLog() {
        when(publicityMapper.selectById(1301L)).thenReturn(publicity(1301L, 2));
        when(disputeMapper.selectCount(any())).thenReturn(0L);
        when(admissionMapper.selectList(any())).thenReturn(List.of(admission(1001L, 1001L, 2),
                admission(1002L, 1001L, 2)));
        when(admissionMapper.updateById(any(Admission.class))).thenReturn(1);

        PublicityConfirmRespVO result = publicityService.confirmFinal(9001L, 1301L);

        assertThat(result.getConfirmedCount()).isEqualTo(2);
        assertThat(result.getStatus()).isEqualTo(3);
        verify(admissionMapper, atLeastOnce()).updateById(any(Admission.class));
        verify(operationLogMapper, atLeastOnce()).insert(any(OperationLog.class));
        verify(userNoticeMapper, atLeastOnce()).insert(any(UserNotice.class));
    }

    /**
     * 快乐路径：公示名单本人完整、他人脱敏，且不含分数与未录取者。
     */
    @Test
    void getStudentPublicity_shouldMaskOthersAndKeepSelf() {
        when(publicityMapper.selectById(1301L)).thenReturn(publicity(1301L, 1));
        when(admissionMapper.selectList(any())).thenReturn(List.of(admission(1001L, 1001L, 2),
                admission(1002L, 1002L, 2)));
        when(sysUserMapper.selectBatchIds(any())).thenReturn(List.of(user(1001L, "20220001", "陈爱丽"),
                user(1002L, "20220002", "张强")));
        when(labMapper.selectBatchIds(any())).thenReturn(List.of(lab(1L, "人工智能实训室")));
        when(mentorProfileMapper.selectBatchIds(any())).thenReturn(List.of(mentor(11L, 1L)));
        when(sysUserMapper.selectById(2001L)).thenReturn(user(2001L, "20010001", "李海峰"));

        PublicityDetailVO detail = publicityService.getStudentPublicity(1001L, 1301L);

        assertThat(detail.getCanDispute()).isEqualTo(1);
        assertThat(detail.getList()).hasSize(2);
        assertThat(detail.getList().get(0).getStudentNo()).isEqualTo("20220001");
        assertThat(detail.getList().get(0).getStudentName()).isEqualTo("陈爱丽");
        assertThat(detail.getList().get(0).getIsSelf()).isEqualTo(1);
        assertThat(detail.getList().get(1).getStudentNo()).isEqualTo("2022****02");
        assertThat(detail.getList().get(1).getStudentName()).isEqualTo("张*");
        assertThat(detail.getList().get(1).getIsSelf()).isEqualTo(0);
    }

    /**
     * 边界：公示结束后学生端不可再提交异议。
     */
    @Test
    void getStudentPublicity_ended_shouldDisableDispute() {
        when(publicityMapper.selectById(1301L)).thenReturn(publicity(1301L, 2));
        when(admissionMapper.selectList(any())).thenReturn(List.of());

        PublicityDetailVO detail = publicityService.getStudentPublicity(1001L, 1301L);

        assertThat(detail.getCanDispute()).isEqualTo(0);
    }

    private PublicityCreateReqDTO createReq() {
        PublicityCreateReqDTO req = new PublicityCreateReqDTO();
        req.setRoundId(1L);
        req.setTitle("第一轮拟录取名单公示");
        req.setDurationHours(24);
        return req;
    }

    private SelectionRound finishedRound() {
        SelectionRound round = new SelectionRound();
        round.setId(1L);
        round.setRoundNo(1);
        round.setStatus(5);
        round.setLocked(0);
        return round;
    }

    private Publicity publicity(Long id, int status) {
        Publicity publicity = new Publicity();
        publicity.setId(id);
        publicity.setRoundId(1L);
        publicity.setTitle("第一轮拟录取名单公示");
        publicity.setStartTime(LocalDateTime.now().minusHours(1));
        publicity.setEndTime(LocalDateTime.now().plusHours(23));
        publicity.setStatus(status);
        return publicity;
    }

    private Admission admission(Long id, Long studentId, int status) {
        Admission admission = new Admission();
        admission.setId(id);
        admission.setRoundId(1L);
        admission.setStudentId(studentId);
        admission.setLabId(1L);
        admission.setMentorId(11L);
        admission.setSourceType(1);
        admission.setStatus(status);
        admission.setTotalScore(new BigDecimal("85.50"));
        return admission;
    }

    private SysUser user(Long id, String userNo, String realName) {
        SysUser user = new SysUser();
        user.setId(id);
        user.setUserNo(userNo);
        user.setRealName(realName);
        user.setUserType(1);
        user.setStatus(1);
        return user;
    }

    private Lab lab(Long id, String name) {
        Lab lab = new Lab();
        lab.setId(id);
        lab.setLabName(name);
        return lab;
    }

    private MentorProfile mentor(Long id, Long labId) {
        MentorProfile mentor = new MentorProfile();
        mentor.setId(id);
        mentor.setUserId(2001L);
        mentor.setLabId(labId);
        return mentor;
    }
}
