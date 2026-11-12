package com.college.labselect.service;

import com.college.labselect.dto.req.InterviewScoreSaveReqDTO;
import com.college.labselect.dto.resp.InterviewScoreRespVO;
import com.college.labselect.dto.resp.ScoreImportResultVO;
import com.college.labselect.entity.InterviewSchedule;
import com.college.labselect.entity.InterviewScore;
import com.college.labselect.entity.Lab;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.OperationLog;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.entity.SysUser;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.InterviewScheduleMapper;
import com.college.labselect.mapper.InterviewScoreMapper;
import com.college.labselect.mapper.InterviewSessionMapper;
import com.college.labselect.mapper.LabMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.OperationLogMapper;
import com.college.labselect.mapper.SelectionRoundMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.service.impl.InterviewScoreServiceImpl;
import com.college.labselect.utils.InterviewScoreExcelParser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mock.web.MockMultipartFile;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 面试评分服务单元测试，阶段 3 以红灯作为阶段 4 的编码边界。
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class InterviewScoreServiceTest {

    @Mock
    private InterviewScoreMapper interviewScoreMapper;

    @Mock
    private InterviewScheduleMapper interviewScheduleMapper;

    @Mock
    private InterviewSessionMapper interviewSessionMapper;

    @Mock
    private SelectionRoundMapper selectionRoundMapper;

    @Mock
    private SysUserMapper sysUserMapper;

    @Mock
    private LabMapper labMapper;

    @Mock
    private MentorProfileMapper mentorProfileMapper;

    @Mock
    private OperationLogMapper operationLogMapper;

    @Mock
    private InterviewScoreExcelParser scoreExcelParser;

    @InjectMocks
    private InterviewScoreServiceImpl interviewScoreService;

    /**
     * 快乐路径：四维 90/85/88/80 等权，系统总分 85.75。
     */
    @Test
    void saveScore_success_shouldCalculateSystemTotal() {
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor());
        when(interviewScheduleMapper.selectOne(any())).thenReturn(schedule());
        when(selectionRoundMapper.selectById(1L)).thenReturn(round());
        when(interviewScoreMapper.selectOne(any())).thenReturn(null);
        when(interviewScoreMapper.insert(any(InterviewScore.class))).thenAnswer(invocation -> {
            InterviewScore score = invocation.getArgument(0);
            score.setId(1001L);
            return 1;
        });

        InterviewScoreRespVO result = interviewScoreService.saveTeacherScore(2001L, scoreReq(1));

        assertThat(result.getSystemTotal()).isEqualByComparingTo("85.75");
        assertThat(result.getFinalTotal()).isEqualByComparingTo("85.75");
        assertThat(result.getStatus()).isEqualTo(2);
    }

    /**
     * 边界：手动覆写总分未填理由返回 400001。
     */
    @Test
    void saveScore_manualWithoutReason_shouldThrow400001() {
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor());
        when(interviewScheduleMapper.selectOne(any())).thenReturn(schedule());
        when(selectionRoundMapper.selectById(1L)).thenReturn(round());
        InterviewScoreSaveReqDTO req = scoreReq(1);
        req.setManualTotal(new BigDecimal("88.00"));
        req.setAdjustReason("");

        BusinessException exception = catchThrowableOfType(
                () -> interviewScoreService.saveTeacherScore(2001L, req), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400001);
    }

    /**
     * 边界：单维分数超过 100 返回 400001。
     */
    @Test
    void saveScore_outOfRange_shouldThrow400001() {
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor());
        when(interviewScheduleMapper.selectOne(any())).thenReturn(schedule());
        when(selectionRoundMapper.selectById(1L)).thenReturn(round());
        InterviewScoreSaveReqDTO req = scoreReq(1);
        req.setAttitudeScore(new BigDecimal("101.00"));

        BusinessException exception = catchThrowableOfType(
                () -> interviewScoreService.saveTeacherScore(2001L, req), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400001);
    }

    /**
     * 边界：学生未在本室面试返回 403001。
     */
    @Test
    void saveScore_studentNotInLab_shouldThrow403001() {
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor());
        when(interviewScheduleMapper.selectOne(any())).thenReturn(null);

        BusinessException exception = catchThrowableOfType(
                () -> interviewScoreService.saveTeacherScore(2001L, scoreReq(1)), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(403001);
    }

    /**
     * 快乐路径：手动覆写总分并使用填写理由，写入操作日志。
     */
    @Test
    void saveScore_manualOverride_shouldWriteLog() {
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor());
        when(interviewScheduleMapper.selectOne(any())).thenReturn(schedule());
        when(selectionRoundMapper.selectById(1L)).thenReturn(round());
        when(interviewScoreMapper.selectOne(any())).thenReturn(null);
        when(interviewScoreMapper.insert(any(InterviewScore.class))).thenAnswer(invocation -> {
            InterviewScore score = invocation.getArgument(0);
            score.setId(1001L);
            return 1;
        });
        InterviewScoreSaveReqDTO req = scoreReq(1);
        req.setManualTotal(new BigDecimal("88.00"));
        req.setAdjustReason("面试现场表现优秀");

        InterviewScoreRespVO result = interviewScoreService.saveTeacherScore(2001L, req);

        assertThat(result.getSystemTotal()).isEqualByComparingTo("85.75");
        assertThat(result.getManualTotal()).isEqualByComparingTo("88.00");
        assertThat(result.getFinalTotal()).isEqualByComparingTo("88.00");
        verify(operationLogMapper).insert(any(OperationLog.class));
    }

    /**
     * 边界：批次锁定后录分返回 400005。
     */
    @Test
    void saveScore_lockedRound_shouldThrow400005() {
        SelectionRound round = round();
        round.setLocked(1);
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor());
        when(interviewScheduleMapper.selectOne(any())).thenReturn(schedule());
        when(selectionRoundMapper.selectById(1L)).thenReturn(round);

        BusinessException exception = catchThrowableOfType(
                () -> interviewScoreService.saveTeacherScore(2001L, scoreReq(1)), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400005);
    }

    /**
     * 边界：面试时间窗结束后录分返回 400004。
     */
    @Test
    void saveScore_outsideInterviewWindow_shouldThrow400004() {
        SelectionRound round = round();
        round.setInterviewEnd(LocalDateTime.now().minusMinutes(1));
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor());
        when(interviewScheduleMapper.selectOne(any())).thenReturn(schedule());
        when(selectionRoundMapper.selectById(1L)).thenReturn(round);

        BusinessException exception = catchThrowableOfType(
                () -> interviewScoreService.saveTeacherScore(2001L, scoreReq(1)), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400004);
    }

    /**
     * 快乐路径：Excel 导入部分失败时返回成功数与失败明细。
     */
    @Test
    void importScores_partialFail_shouldReturnCountsAndFailList() {
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor());
        when(selectionRoundMapper.selectOne(any())).thenReturn(round());
        when(scoreExcelParser.parse(any())).thenReturn(List.of(
                row(2, "20220001"), row(3, "20229999")));
        SysUser student = new SysUser();
        student.setId(1001L);
        student.setUserNo("20220001");
        student.setUserType(1);
        when(sysUserMapper.selectOne(any())).thenReturn(student, (SysUser) null);
        when(interviewScheduleMapper.selectOne(any())).thenReturn(schedule());
        when(selectionRoundMapper.selectById(1L)).thenReturn(round());
        when(interviewScoreMapper.selectOne(any())).thenReturn(null);
        when(interviewScoreMapper.insert(any(InterviewScore.class))).thenAnswer(invocation -> {
            InterviewScore score = invocation.getArgument(0);
            score.setId(1001L);
            return 1;
        });
        MockMultipartFile file = new MockMultipartFile("file", "scores.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", new byte[0]);

        ScoreImportResultVO result = interviewScoreService.importTeacherScores(2001L, file);

        assertThat(result.getTotalCount()).isEqualTo(2);
        assertThat(result.getSuccessCount()).isEqualTo(1);
        assertThat(result.getFailCount()).isEqualTo(1);
        assertThat(result.getFailList()).hasSize(1);
        assertThat(result.getFailList().get(0).getRowNo()).isEqualTo(3);
        assertThat(result.getFailList().get(0).getUserNo()).isEqualTo("20229999");
    }

    private InterviewScoreExcelParser.Row row(int rowNo, String userNo) {
        InterviewScoreExcelParser.Row row = new InterviewScoreExcelParser.Row();
        row.setRowNo(rowNo);
        row.setUserNo(userNo);
        row.setAttitudeScore(new BigDecimal("90.00"));
        row.setLogicScore(new BigDecimal("85.00"));
        row.setProgrammingScore(new BigDecimal("88.00"));
        row.setTimeScore(new BigDecimal("80.00"));
        row.setComment("导入");
        return row;
    }

    private Lab lab() {
        Lab lab = new Lab();
        lab.setId(1L);
        lab.setLeaderId(2001L);
        return lab;
    }

    private InterviewSchedule schedule() {
        InterviewSchedule schedule = new InterviewSchedule();
        schedule.setId(801L);
        schedule.setRoundId(1L);
        schedule.setLabId(1L);
        schedule.setMentorId(11L);
        schedule.setSessionId(701L);
        schedule.setStudentId(1001L);
        schedule.setStatus(1);
        return schedule;
    }

    private MentorProfile mentor() {
        MentorProfile mentor = new MentorProfile();
        mentor.setId(11L);
        mentor.setUserId(2001L);
        mentor.setLabId(1L);
        mentor.setStatus(1);
        return mentor;
    }

    private SelectionRound round() {
        SelectionRound round = new SelectionRound();
        round.setId(1L);
        round.setStatus(3);
        round.setLocked(0);
        round.setInterviewStart(LocalDateTime.now().minusDays(1));
        round.setInterviewEnd(LocalDateTime.now().plusDays(1));
        round.setWeightAttitude(new BigDecimal("25.00"));
        round.setWeightLogic(new BigDecimal("25.00"));
        round.setWeightProgramming(new BigDecimal("25.00"));
        round.setWeightTime(new BigDecimal("25.00"));
        return round;
    }

    private InterviewScoreSaveReqDTO scoreReq(int submit) {
        InterviewScoreSaveReqDTO req = new InterviewScoreSaveReqDTO();
        req.setRoundId(1L);
        req.setStudentId(1001L);
        req.setAttitudeScore(new BigDecimal("90.00"));
        req.setLogicScore(new BigDecimal("85.00"));
        req.setProgrammingScore(new BigDecimal("88.00"));
        req.setTimeScore(new BigDecimal("80.00"));
        req.setComment("基础扎实，项目经历丰富");
        req.setSubmit(submit);
        return req;
    }
}
