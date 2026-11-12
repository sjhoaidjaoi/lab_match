package com.college.labselect.service;

import com.college.labselect.dto.req.DisputeHandleReqDTO;
import com.college.labselect.dto.req.DisputeSubmitReqDTO;
import com.college.labselect.dto.resp.DisputeHandleRespVO;
import com.college.labselect.entity.Admission;
import com.college.labselect.entity.Dispute;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.Publicity;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.entity.SysUser;
import com.college.labselect.entity.UserNotice;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.AdmissionMapper;
import com.college.labselect.mapper.DisputeMapper;
import com.college.labselect.mapper.LabMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.OperationLogMapper;
import com.college.labselect.mapper.PublicityMapper;
import com.college.labselect.mapper.SelectionRoundMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.mapper.UserNoticeMapper;
import com.college.labselect.service.impl.DisputeServiceImpl;
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
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 异议工单服务单元测试，阶段 3 以红灯作为阶段 4 的编码边界。
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DisputeServiceTest {

    @Mock
    private DisputeMapper disputeMapper;

    @Mock
    private PublicityMapper publicityMapper;

    @Mock
    private AdmissionMapper admissionMapper;

    @Mock
    private SelectionRoundMapper selectionRoundMapper;

    @Mock
    private MentorProfileMapper mentorProfileMapper;

    @Mock
    private SysUserMapper sysUserMapper;

    @Mock
    private LabMapper labMapper;

    @Mock
    private UserNoticeMapper userNoticeMapper;

    @Mock
    private OperationLogMapper operationLogMapper;

    @InjectMocks
    private DisputeServiceImpl disputeService;

    /**
     * 边界：公示期外提交异议返回 400004。
     */
    @Test
    void submitDispute_outOfWindow_shouldThrow400004() {
        Publicity publicity = publicity(1301L, 1, LocalDateTime.now().minusDays(2),
                LocalDateTime.now().minusDays(1));
        when(publicityMapper.selectById(1301L)).thenReturn(publicity);

        BusinessException exception = catchThrowableOfType(
                () -> disputeService.submitDispute(1001L, submitReq("录取结果有误", 2)), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400004);
    }

    /**
     * 边界：同一公示下重复提交异议返回 409001。
     */
    @Test
    void submitDispute_duplicate_shouldThrow409001() {
        when(publicityMapper.selectById(1301L)).thenReturn(activePublicity());
        when(disputeMapper.selectCount(any())).thenReturn(1L);

        BusinessException exception = catchThrowableOfType(
                () -> disputeService.submitDispute(1001L, submitReq("重复提交", 0)), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(409001);
    }

    /**
     * 边界：异议说明超过 500 字返回 400001。
     */
    @Test
    void submitDispute_contentTooLong_shouldThrow400001() {
        when(publicityMapper.selectById(1301L)).thenReturn(activePublicity());
        when(disputeMapper.selectCount(any())).thenReturn(0L);
        String longContent = "异".repeat(501);

        BusinessException exception = catchThrowableOfType(
                () -> disputeService.submitDispute(1001L, submitReq(longContent, 0)), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400001);
    }

    /**
     * 边界：附件超过 3 个返回 400001。
     */
    @Test
    void submitDispute_attachmentsTooMany_shouldThrow400001() {
        when(publicityMapper.selectById(1301L)).thenReturn(activePublicity());
        when(disputeMapper.selectCount(any())).thenReturn(0L);
        DisputeSubmitReqDTO req = submitReq("附件超限", 0);
        req.setAttachments(List.of("/a1.png", "/a2.png", "/a3.png", "/a4.png"));

        BusinessException exception = catchThrowableOfType(
                () -> disputeService.submitDispute(1001L, req), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400001);
    }

    /**
     * 快乐路径：提交异议写工单并通知管理员。
     */
    @Test
    void submitDispute_success_shouldWriteDisputeAndNotifyAdmin() {
        when(publicityMapper.selectById(1301L)).thenReturn(activePublicity());
        when(disputeMapper.selectCount(any())).thenReturn(0L);
        when(sysUserMapper.selectList(any())).thenReturn(List.of(adminUser()));

        disputeService.submitDispute(1001L, submitReq("录取结果有误，请核查", 1));

        verify(disputeMapper, atLeastOnce()).insert(any(Dispute.class));
        verify(userNoticeMapper, atLeastOnce()).insert(any(UserNotice.class));
    }

    /**
     * 边界：批次锁定后调整录取必须解锁，返回 400005。
     */
    @Test
    void handleDispute_lockedRoundAdjust_shouldThrow400005() {
        when(disputeMapper.selectById(1201L)).thenReturn(dispute(1201L, 1));
        when(publicityMapper.selectById(1301L)).thenReturn(activePublicity());
        SelectionRound round = round();
        round.setLocked(1);
        when(selectionRoundMapper.selectById(1L)).thenReturn(round);

        BusinessException exception = catchThrowableOfType(
                () -> disputeService.handleDispute(9001L, 1201L, handleReq(2, 12L)), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400005);
    }

    /**
     * 边界：工单已处理时重复处理返回 409001。
     */
    @Test
    void handleDispute_alreadyHandled_shouldThrow409001() {
        when(disputeMapper.selectById(1201L)).thenReturn(dispute(1201L, 3));

        BusinessException exception = catchThrowableOfType(
                () -> disputeService.handleDispute(9001L, 1201L, handleReq(1, null)), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(409001);
    }

    /**
     * 边界：调整录取时目标导师名额不足返回 400002。
     */
    @Test
    void handleDispute_adjustMentorNoQuota_shouldThrow400002() {
        stubHandleReady();
        when(mentorProfileMapper.selectById(12L)).thenReturn(mentor(12L, 4, 4));

        BusinessException exception = catchThrowableOfType(
                () -> disputeService.handleDispute(9001L, 1201L, handleReq(2, 12L)), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400002);
    }

    /**
     * 快乐路径：处理异议写处理结果、操作日志并通知学生。
     */
    @Test
    void handleDispute_success_shouldUpdateAndLogAndNotify() {
        stubHandleReady();
        when(mentorProfileMapper.selectById(12L)).thenReturn(mentor(12L, 4, 1));
        when(mentorProfileMapper.update(any(), any())).thenReturn(1);
        when(admissionMapper.selectOne(any())).thenReturn(admission());
        when(admissionMapper.updateById(any(Admission.class))).thenReturn(1);

        DisputeHandleRespVO result = disputeService.handleDispute(9001L, 1201L, handleReq(2, 12L));

        assertThat(result.getStatus()).isEqualTo(3);
        verify(disputeMapper, atLeastOnce()).updateById(any(Dispute.class));
        verify(operationLogMapper, atLeastOnce()).insert(any(com.college.labselect.entity.OperationLog.class));
        verify(userNoticeMapper, atLeastOnce()).insert(any(UserNotice.class));
    }

    private void stubHandleReady() {
        when(disputeMapper.selectById(1201L)).thenReturn(dispute(1201L, 1));
        when(publicityMapper.selectById(1301L)).thenReturn(activePublicity());
        when(selectionRoundMapper.selectById(1L)).thenReturn(round());
        when(sysUserMapper.selectById(1001L)).thenReturn(student());
        when(sysUserMapper.selectById(9001L)).thenReturn(adminUser());
        when(labMapper.selectById(1L)).thenReturn(null);
    }

    private DisputeSubmitReqDTO submitReq(String content, int type) {
        DisputeSubmitReqDTO req = new DisputeSubmitReqDTO();
        req.setPublicityId(1301L);
        req.setDisputeType(type);
        req.setContent(content);
        req.setAttachments(List.of());
        return req;
    }

    private DisputeHandleReqDTO handleReq(int result, Long mentorId) {
        DisputeHandleReqDTO req = new DisputeHandleReqDTO();
        req.setHandleResult(result);
        req.setHandleOpinion("经核查，调整至目标导师");
        req.setAdjustMentorId(mentorId);
        return req;
    }

    private Publicity activePublicity() {
        return publicity(1301L, 1, LocalDateTime.now().minusHours(1), LocalDateTime.now().plusHours(23));
    }

    private Publicity publicity(Long id, int status, LocalDateTime start, LocalDateTime end) {
        Publicity publicity = new Publicity();
        publicity.setId(id);
        publicity.setRoundId(1L);
        publicity.setTitle("第一轮拟录取名单公示");
        publicity.setStartTime(start);
        publicity.setEndTime(end);
        publicity.setStatus(status);
        return publicity;
    }

    private Dispute dispute(Long id, int status) {
        Dispute dispute = new Dispute();
        dispute.setId(id);
        dispute.setPublicityId(1301L);
        dispute.setStudentId(1001L);
        dispute.setDisputeType(1);
        dispute.setContent("录取结果有误");
        dispute.setStatus(status);
        return dispute;
    }

    private SelectionRound round() {
        SelectionRound round = new SelectionRound();
        round.setId(1L);
        round.setRoundNo(1);
        round.setStatus(5);
        round.setLocked(0);
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

    private Admission admission() {
        Admission admission = new Admission();
        admission.setId(901L);
        admission.setRoundId(1L);
        admission.setStudentId(1001L);
        admission.setLabId(1L);
        admission.setMentorId(11L);
        admission.setSourceType(1);
        admission.setStatus(2);
        return admission;
    }

    private SysUser student() {
        SysUser user = new SysUser();
        user.setId(1001L);
        user.setUserNo("20220001");
        user.setRealName("陈爱丽");
        user.setUserType(1);
        return user;
    }

    private SysUser adminUser() {
        SysUser user = new SysUser();
        user.setId(9001L);
        user.setUserNo("admin");
        user.setRealName("系统管理员");
        user.setUserType(3);
        return user;
    }
}
