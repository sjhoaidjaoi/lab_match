package com.college.labselect.service;

import com.college.labselect.dto.req.ConfirmRespondReqDTO;
import com.college.labselect.dto.resp.ConfirmCenterVO;
import com.college.labselect.dto.resp.ConfirmRespondRespVO;
import com.college.labselect.entity.Admission;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.AdmissionMapper;
import com.college.labselect.mapper.LabMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.NominationMapper;
import com.college.labselect.mapper.SelectionRoundMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.mapper.WaitlistMapper;
import com.college.labselect.service.impl.AdmissionServiceImpl;
import com.college.labselect.service.impl.AdmissionWaitlistSupport;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 录取与确认服务单元测试，阶段 3 以红灯作为阶段 4 的编码边界。
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AdmissionServiceTest {

    @Mock
    private AdmissionMapper admissionMapper;

    @Mock
    private NominationMapper nominationMapper;

    @Mock
    private WaitlistMapper waitlistMapper;

    @Mock
    private MentorProfileMapper mentorProfileMapper;

    @Mock
    private SelectionRoundMapper selectionRoundMapper;

    @Mock
    private LabMapper labMapper;

    @Mock
    private SysUserMapper sysUserMapper;

    @Mock
    private AdmissionWaitlistSupport admissionWaitlistSupport;

    @InjectMocks
    private AdmissionServiceImpl admissionService;

    /**
     * 边界：确认开始前待确认中心返回空列表。
     */
    @Test
    void confirmCenter_beforeConfirmStart_shouldReturnEmpty() {
        when(selectionRoundMapper.selectOne(any())).thenReturn(round(LocalDateTime.now().plusHours(2)));

        ConfirmCenterVO result = admissionService.confirmCenter(1001L);

        assertThat(result.getTotal()).isZero();
        assertThat(result.getItems()).isEmpty();
    }

    /**
     * 边界：操作他人待确认记录返回 403001。
     */
    @Test
    void respond_otherStudent_shouldThrow403001() {
        when(admissionMapper.selectById(901L)).thenReturn(admission(901L, 1002L, 1));

        BusinessException exception = catchThrowableOfType(
                () -> admissionService.respond(1001L, 901L, acceptReq()), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(403001);
    }

    /**
     * 边界：超过确认截止时间返回 400004。
     */
    @Test
    void respond_afterDeadline_shouldThrow400004() {
        Admission admission = admission(901L, 1001L, 1);
        admission.setConfirmDeadline(LocalDateTime.now().minusMinutes(1));
        when(admissionMapper.selectById(901L)).thenReturn(admission);

        BusinessException exception = catchThrowableOfType(
                () -> admissionService.respond(1001L, 901L, acceptReq()), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400004);
    }

    /**
     * 边界：本轮已有终局录取去向时再次确认返回 400005。
     */
    @Test
    void respond_alreadyHasFinalAdmission_shouldThrow400005() {
        Admission admission = admission(901L, 1001L, 1);
        when(admissionMapper.selectById(901L)).thenReturn(admission);
        when(admissionMapper.selectCount(any())).thenReturn(1L);

        BusinessException exception = catchThrowableOfType(
                () -> admissionService.respond(1001L, 901L, acceptReq()), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400005);
    }

    /**
     * 快乐路径：接受其一，返回已确认状态并释放其余待确认记录。
     */
    @Test
    void respond_accept_shouldConfirmAndAbandonOthers() {
        when(admissionMapper.selectById(901L)).thenReturn(admission(901L, 1001L, 1));
        when(admissionMapper.selectCount(any())).thenReturn(0L);
        when(admissionMapper.selectList(any())).thenReturn(java.util.List.of(admission(902L, 1001L, 1)));

        ConfirmRespondRespVO result = admissionService.respond(1001L, 901L, acceptReq());

        assertThat(result.getStatus()).isEqualTo(2);
        verify(admissionMapper, atLeastOnce()).updateById(any(Admission.class));
    }

    /**
     * 快乐路径：拒绝录取返回已放弃状态并触发递补。
     */
    @Test
    void respond_reject_shouldReturnAbandonedStatus() {
        when(admissionMapper.selectById(901L)).thenReturn(admission(901L, 1001L, 1));

        ConfirmRespondRespVO result = admissionService.respond(1001L, 901L, rejectReq());

        assertThat(result.getStatus()).isEqualTo(4);
        verify(admissionMapper, atLeastOnce()).updateById(any(Admission.class));
    }

    private SelectionRound round(LocalDateTime confirmStart) {
        SelectionRound round = new SelectionRound();
        round.setId(1L);
        round.setStatus(4);
        round.setConfirmStart(confirmStart);
        round.setNominationEnd(confirmStart.plusHours(4));
        return round;
    }

    private Admission admission(Long id, Long studentId, int status) {
        Admission admission = new Admission();
        admission.setId(id);
        admission.setRoundId(1L);
        admission.setStudentId(studentId);
        admission.setLabId(1L);
        admission.setMentorId(11L);
        admission.setSourceType(1);
        admission.setPendingType(1);
        admission.setStatus(status);
        admission.setConfirmDeadline(LocalDateTime.now().plusHours(2));
        return admission;
    }

    private ConfirmRespondReqDTO acceptReq() {
        ConfirmRespondReqDTO req = new ConfirmRespondReqDTO();
        req.setAction("ACCEPT");
        return req;
    }

    private ConfirmRespondReqDTO rejectReq() {
        ConfirmRespondReqDTO req = new ConfirmRespondReqDTO();
        req.setAction("REJECT");
        req.setReason("已有更合适的去向");
        return req;
    }
}
