package com.college.labselect.service;

import com.college.labselect.dto.req.RoundCreateReqDTO;
import com.college.labselect.dto.req.RoundUpdateReqDTO;
import com.college.labselect.dto.resp.CurrentRoundVO;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.SelectionRoundMapper;
import com.college.labselect.service.impl.RoundServiceImpl;
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
import static org.mockito.Mockito.when;

/**
 * 轮次服务单元测试，阶段 3 以红灯作为阶段 4 的编码边界。
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RoundServiceTest {

    @Mock
    private SelectionRoundMapper selectionRoundMapper;

    @InjectMocks
    private RoundServiceImpl roundService;

    /**
     * 边界：四维权重合计不等于 100 返回 400002。
     */
    @Test
    void createRound_weightSumNot100_shouldThrow400002() {
        RoundCreateReqDTO req = createReq();
        req.setWeightTime(new BigDecimal("24.00"));

        BusinessException exception = catchThrowableOfType(
                () -> roundService.createRound(req), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400002);
    }

    /**
     * 边界：填报结束晚于面试开始返回 400002。
     */
    @Test
    void createRound_timeWindowInvalid_shouldThrow400002() {
        RoundCreateReqDTO req = createReq();
        req.setApplyEnd(req.getInterviewStart().plusHours(1));

        BusinessException exception = catchThrowableOfType(
                () -> roundService.createRound(req), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400002);
    }

    /**
     * 边界：轮次序号重复返回 409001。
     */
    @Test
    void createRound_roundNoDuplicate_shouldThrow409001() {
        when(selectionRoundMapper.selectCount(any())).thenReturn(1L);

        BusinessException exception = catchThrowableOfType(
                () -> roundService.createRound(createReq()), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(409001);
    }

    /**
     * 边界：批次已锁定时修改轮次返回 400005。
     */
    @Test
    void updateRound_locked_shouldThrow400005() {
        SelectionRound round = round(1L, 3, 1);
        when(selectionRoundMapper.selectById(1L)).thenReturn(round);

        BusinessException exception = catchThrowableOfType(
                () -> roundService.updateRound(1L, updateReq()), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400005);
    }

    /**
     * 边界：进入面试后修改四维权重返回 400005。
     */
    @Test
    void updateRound_statusAtLeast3WeightChange_shouldThrow400005() {
        SelectionRound round = round(1L, 3, 0);
        when(selectionRoundMapper.selectById(1L)).thenReturn(round);
        RoundUpdateReqDTO req = updateReq();
        req.setWeightAttitude(new BigDecimal("30.00"));
        req.setWeightLogic(new BigDecimal("30.00"));
        req.setWeightProgramming(new BigDecimal("20.00"));
        req.setWeightTime(new BigDecimal("20.00"));

        BusinessException exception = catchThrowableOfType(
                () -> roundService.updateRound(1L, req), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400005);
    }

    /**
     * 快乐路径：当前时间落在填报窗口内，返回 APPLY 阶段。
     */
    @Test
    void getCurrentRound_applyPhase_shouldReturnApply() {
        SelectionRound round = round(1L, 2, 0);
        round.setApplyStart(LocalDateTime.now().minusHours(1));
        round.setApplyEnd(LocalDateTime.now().plusHours(1));
        round.setInterviewStart(round.getApplyEnd());
        round.setInterviewEnd(LocalDateTime.now().plusDays(1));
        when(selectionRoundMapper.selectOne(any())).thenReturn(round);

        CurrentRoundVO result = roundService.getCurrentRound();

        assertThat(result.getPhase()).isEqualTo("APPLY");
        assertThat(result.getServerTime()).isNotNull();
    }

    /**
     * 快乐路径：新建轮次返回主键。
     */
    @Test
    void createRound_success_shouldReturnId() {
        when(selectionRoundMapper.selectCount(any())).thenReturn(0L);
        when(selectionRoundMapper.selectList(any())).thenReturn(List.of());
        when(selectionRoundMapper.insert(any(SelectionRound.class))).thenAnswer(invocation -> {
            SelectionRound round = invocation.getArgument(0);
            round.setId(71L);
            return 1;
        });

        Long id = roundService.createRound(createReq());

        assertThat(id).isEqualTo(71L);
    }

    /**
     * 边界：批次锁定后当前阶段为 LOCKED。
     */
    @Test
    void getCurrentRound_locked_shouldReturnLocked() {
        when(selectionRoundMapper.selectOne(any())).thenReturn(round(1L, 4, 1));

        CurrentRoundVO result = roundService.getCurrentRound();

        assertThat(result.getPhase()).isEqualTo("LOCKED");
        assertThat(result.getCountdownSeconds()).isZero();
    }

    private SelectionRound round(Long id, int status, int locked) {
        SelectionRound round = new SelectionRound();
        round.setId(id);
        round.setRoundNo(1);
        round.setRoundName("第一轮双选");
        round.setStatus(status);
        round.setLocked(locked);
        round.setApplyStart(LocalDateTime.of(2026, 11, 1, 8, 0));
        round.setApplyEnd(LocalDateTime.of(2026, 11, 1, 12, 0));
        round.setInterviewStart(LocalDateTime.of(2026, 11, 1, 12, 0));
        round.setInterviewEnd(LocalDateTime.of(2026, 11, 2, 17, 0));
        round.setNominationStart(LocalDateTime.of(2026, 11, 2, 17, 0));
        round.setNominationSubmitEnd(LocalDateTime.of(2026, 11, 3, 7, 0));
        round.setConfirmStart(LocalDateTime.of(2026, 11, 3, 8, 0));
        round.setNominationEnd(LocalDateTime.of(2026, 11, 3, 12, 0));
        round.setAdjustStart(LocalDateTime.of(2026, 11, 4, 8, 0));
        round.setAdjustEnd(LocalDateTime.of(2026, 11, 4, 12, 0));
        round.setWeightAttitude(new BigDecimal("25.00"));
        round.setWeightLogic(new BigDecimal("25.00"));
        round.setWeightProgramming(new BigDecimal("25.00"));
        round.setWeightTime(new BigDecimal("25.00"));
        return round;
    }

    private RoundCreateReqDTO createReq() {
        RoundCreateReqDTO req = new RoundCreateReqDTO();
        req.setRoundNo(1);
        fillBase(req);
        return req;
    }

    private RoundUpdateReqDTO updateReq() {
        RoundUpdateReqDTO req = new RoundUpdateReqDTO();
        fillBase(req);
        return req;
    }

    private void fillBase(com.college.labselect.dto.req.RoundBaseReqDTO req) {
        req.setRoundName("第一轮双选");
        req.setApplyStart(LocalDateTime.of(2026, 11, 1, 8, 0));
        req.setApplyEnd(LocalDateTime.of(2026, 11, 1, 12, 0));
        req.setInterviewStart(LocalDateTime.of(2026, 11, 1, 12, 0));
        req.setInterviewEnd(LocalDateTime.of(2026, 11, 2, 17, 0));
        req.setNominationStart(LocalDateTime.of(2026, 11, 2, 17, 0));
        req.setNominationSubmitEnd(LocalDateTime.of(2026, 11, 3, 7, 0));
        req.setConfirmStart(LocalDateTime.of(2026, 11, 3, 8, 0));
        req.setNominationEnd(LocalDateTime.of(2026, 11, 3, 12, 0));
        req.setAdjustStart(LocalDateTime.of(2026, 11, 4, 8, 0));
        req.setAdjustEnd(LocalDateTime.of(2026, 11, 4, 12, 0));
        req.setWeightAttitude(new BigDecimal("25.00"));
        req.setWeightLogic(new BigDecimal("25.00"));
        req.setWeightProgramming(new BigDecimal("25.00"));
        req.setWeightTime(new BigDecimal("25.00"));
    }
}
