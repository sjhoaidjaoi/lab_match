package com.college.labselect.service;

import com.college.labselect.dto.req.InterviewSessionSaveReqDTO;
import com.college.labselect.dto.resp.PublishScheduleRespVO;
import com.college.labselect.entity.Intention;
import com.college.labselect.entity.IntentionItem;
import com.college.labselect.entity.InterviewSchedule;
import com.college.labselect.entity.InterviewSession;
import com.college.labselect.entity.Lab;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.OperationLog;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.entity.SysUser;
import com.college.labselect.entity.UserNotice;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.IntentionItemMapper;
import com.college.labselect.mapper.IntentionMapper;
import com.college.labselect.mapper.InterviewScheduleMapper;
import com.college.labselect.mapper.InterviewSessionInterviewerMapper;
import com.college.labselect.mapper.InterviewSessionMapper;
import com.college.labselect.mapper.LabMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.OperationLogMapper;
import com.college.labselect.mapper.SelectionRoundMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.mapper.UserNoticeMapper;
import com.college.labselect.service.impl.InterviewSessionServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 面试场次服务单元测试，阶段 3 以红灯作为阶段 4 的编码边界。
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class InterviewSessionServiceTest {

    @Mock
    private InterviewSessionMapper interviewSessionMapper;

    @Mock
    private InterviewScheduleMapper interviewScheduleMapper;

    @Mock
    private LabMapper labMapper;

    @Mock
    private MentorProfileMapper mentorProfileMapper;

    @Mock
    private InterviewSessionInterviewerMapper interviewerMapper;

    @Mock
    private IntentionMapper intentionMapper;

    @Mock
    private IntentionItemMapper intentionItemMapper;

    @Mock
    private SelectionRoundMapper selectionRoundMapper;

    @Mock
    private SysUserMapper sysUserMapper;

    @Mock
    private UserNoticeMapper userNoticeMapper;

    @Mock
    private OperationLogMapper operationLogMapper;

    @InjectMocks
    private InterviewSessionServiceImpl interviewSessionService;

    /**
     * 快乐路径：新增场次返回主键。
     */
    @Test
    void createSession_success_shouldReturnId() {
        when(labMapper.selectOne(any())).thenReturn(lab());
        when(selectionRoundMapper.selectById(1L)).thenReturn(round());
        when(mentorProfileMapper.selectList(any())).thenReturn(List.of(mentor(2001L), mentor(2002L)));
        when(sysUserMapper.selectBatchIds(any())).thenReturn(List.of(user(2001L), user(2002L)));
        when(interviewSessionMapper.insert(any(InterviewSession.class))).thenAnswer(invocation -> {
            InterviewSession session = invocation.getArgument(0);
            session.setId(701L);
            return 1;
        });

        Long id = interviewSessionService.createSession(2001L, sessionReq());

        assertThat(id).isEqualTo(701L);
    }

    /**
     * 边界：已发布场次不允许删除，返回 400005。
     */
    @Test
    void deleteSession_published_shouldThrow400005() {
        InterviewSession session = session(1L, 14, 0, 15, 30, 30);
        session.setStatus(2);
        when(interviewSessionMapper.selectById(1L)).thenReturn(session);

        BusinessException exception = catchThrowableOfType(
                () -> interviewSessionService.deleteSession(2001L, 1L), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400005);
    }

    /**
     * 边界：同一学生同一时段排两场，发布返回 409001。
     */
    @Test
    void publish_studentTimeConflict_shouldThrow409001() {
        when(labMapper.selectOne(any())).thenReturn(lab());
        when(interviewSessionMapper.selectList(any())).thenReturn(List.of(
                session(1L, 14, 0, 15, 30, 30),
                session(2L, 14, 30, 16, 0, 30)));
        when(interviewScheduleMapper.selectList(any())).thenReturn(List.of(
                schedule(1L, 1L, 1001L),
                schedule(2L, 2L, 1001L)));

        BusinessException exception = catchThrowableOfType(
                () -> interviewSessionService.publish(2001L, 1L), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(409001);
    }

    /**
     * 边界：场次超出容量，发布返回 400002。
     */
    @Test
    void publish_capacityExceeded_shouldThrow400002() {
        InterviewSession session = session(1L, 14, 0, 15, 30, 1);
        when(labMapper.selectOne(any())).thenReturn(lab());
        when(interviewSessionMapper.selectList(any())).thenReturn(List.of(session));
        when(interviewScheduleMapper.selectList(any())).thenReturn(List.of(
                schedule(1L, 1L, 1001L),
                schedule(2L, 1L, 1002L)));

        BusinessException exception = catchThrowableOfType(
                () -> interviewSessionService.publish(2001L, 1L), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400002);
    }

    /**
     * 快乐路径：发布排期更新场次状态并推送通知。
     */
    @Test
    void publish_success_shouldPublishAndSendNotices() {
        when(labMapper.selectOne(any())).thenReturn(lab());
        when(interviewSessionMapper.selectList(any())).thenReturn(List.of(
                session(1L, 14, 0, 15, 30, 30)));
        when(interviewScheduleMapper.selectList(any())).thenReturn(List.of(
                schedule(1L, 1L, 1001L),
                schedule(2L, 1L, 1002L)));

        PublishScheduleRespVO result = interviewSessionService.publish(2001L, 1L);

        assertThat(result.getSessionCount()).isEqualTo(1);
        assertThat(result.getStudentCount()).isEqualTo(2);
        assertThat(result.getNoticeCount()).isEqualTo(2);
        verify(interviewSessionMapper).updateById(any(InterviewSession.class));
        verify(userNoticeMapper, times(2)).insert(any(UserNotice.class));
    }

    /**
     * 边界：本室已提交意向学生未全部排期时拒绝发布。
     */
    @Test
    void publish_missingSchedule_shouldThrow400002() {
        when(labMapper.selectOne(any())).thenReturn(lab());
        when(interviewSessionMapper.selectList(any())).thenReturn(List.of(
                session(1L, 14, 0, 15, 30, 30)));
        when(interviewScheduleMapper.selectList(any())).thenReturn(List.of(
                schedule(1L, 1L, 1001L)));
        when(intentionMapper.selectList(any())).thenReturn(List.of(
                intention(61L, 1001L), intention(62L, 1002L)));
        when(intentionItemMapper.selectList(any())).thenReturn(List.of(
                intentionItem(61L), intentionItem(62L)));

        BusinessException exception = catchThrowableOfType(
                () -> interviewSessionService.publish(2001L, 1L), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400002);
    }

    /**
     * 快乐路径：取消发布后场次回退草稿，学生收到变更通知并写入操作日志。
     */
    @Test
    void cancelPublish_success_shouldRevertAndNotify() {
        InterviewSession published = session(1L, 14, 0, 15, 30, 30);
        published.setStatus(2);
        when(labMapper.selectOne(any())).thenReturn(lab());
        when(selectionRoundMapper.selectById(1L)).thenReturn(round());
        when(interviewSessionMapper.selectList(any())).thenReturn(List.of(published));
        when(interviewScheduleMapper.selectList(any())).thenReturn(List.of(
                schedule(1L, 1L, 1001L),
                schedule(2L, 1L, 1002L)));

        PublishScheduleRespVO result = interviewSessionService.cancelPublish(2001L, 1L, "面试官临时调整");

        assertThat(result.getSessionCount()).isEqualTo(1);
        assertThat(result.getStudentCount()).isEqualTo(2);
        assertThat(result.getNoticeCount()).isEqualTo(2);
        verify(interviewSessionMapper).updateById(any(InterviewSession.class));
        verify(userNoticeMapper, times(2)).insert(any(UserNotice.class));
        verify(operationLogMapper).insert(any(OperationLog.class));
    }

    /**
     * 边界：没有已发布场次时取消并重排返回 400005。
     */
    @Test
    void cancelPublish_noPublishedSession_shouldThrow400005() {
        when(labMapper.selectOne(any())).thenReturn(lab());
        when(selectionRoundMapper.selectById(1L)).thenReturn(round());
        when(interviewSessionMapper.selectList(any())).thenReturn(List.of());

        BusinessException exception = catchThrowableOfType(
                () -> interviewSessionService.cancelPublish(2001L, 1L, "面试官临时调整"),
                BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400005);
    }

    private Lab lab() {
        Lab lab = new Lab();
        lab.setId(1L);
        lab.setLeaderId(2001L);
        return lab;
    }

    private SelectionRound round() {
        SelectionRound round = new SelectionRound();
        round.setId(1L);
        round.setRoundNo(1);
        round.setStatus(3);
        round.setInterviewStart(LocalDateTime.of(2026, 11, 1, 9, 0));
        round.setInterviewEnd(LocalDateTime.of(2026, 11, 3, 18, 0));
        return round;
    }

    private MentorProfile mentor(Long userId) {
        MentorProfile mentor = new MentorProfile();
        mentor.setId(userId + 100);
        mentor.setUserId(userId);
        mentor.setLabId(1L);
        return mentor;
    }

    private SysUser user(Long id) {
        SysUser user = new SysUser();
        user.setId(id);
        user.setStatus(1);
        return user;
    }

    private Intention intention(Long id, Long studentId) {
        Intention intention = new Intention();
        intention.setId(id);
        intention.setRoundId(1L);
        intention.setStudentId(studentId);
        intention.setStatus(2);
        return intention;
    }

    private IntentionItem intentionItem(Long intentionId) {
        IntentionItem item = new IntentionItem();
        item.setIntentionId(intentionId);
        item.setMentorId(11L);
        item.setLabId(1L);
        return item;
    }

    private InterviewSession session(Long id, int startHour, int startMinute,
                                     int endHour, int endMinute, int capacity) {
        InterviewSession session = new InterviewSession();
        session.setId(id);
        session.setRoundId(1L);
        session.setLabId(1L);
        session.setSessionName("第一场");
        session.setInterviewDate(LocalDate.of(2026, 11, 2));
        session.setStartTime(LocalTime.of(startHour, startMinute));
        session.setEndTime(LocalTime.of(endHour, endMinute));
        session.setLocation("实验楼 A301");
        session.setCapacity(capacity);
        session.setStatus(1);
        return session;
    }

    private InterviewSchedule schedule(Long id, Long sessionId, Long studentId) {
        InterviewSchedule schedule = new InterviewSchedule();
        schedule.setId(id);
        schedule.setRoundId(1L);
        schedule.setLabId(1L);
        schedule.setSessionId(sessionId);
        schedule.setStudentId(studentId);
        schedule.setStatus(1);
        return schedule;
    }

    private InterviewSessionSaveReqDTO sessionReq() {
        InterviewSessionSaveReqDTO req = new InterviewSessionSaveReqDTO();
        req.setRoundId(1L);
        req.setSessionName("第一场");
        req.setInterviewDate(LocalDate.of(2026, 11, 2));
        req.setStartTime(LocalTime.of(14, 0));
        req.setEndTime(LocalTime.of(15, 30));
        req.setLocation("实验楼 A301");
        req.setCapacity(30);
        req.setInterviewerIds(List.of(2001L, 2002L));
        return req;
    }
}
