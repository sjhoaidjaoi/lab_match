package com.college.labselect.service;

import com.college.labselect.dto.req.ScheduleAdjustReqDTO;
import com.college.labselect.dto.req.ScheduleItemReqDTO;
import com.college.labselect.entity.Intention;
import com.college.labselect.entity.IntentionItem;
import com.college.labselect.entity.InterviewSchedule;
import com.college.labselect.entity.InterviewSession;
import com.college.labselect.entity.Lab;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.IntentionItemMapper;
import com.college.labselect.mapper.IntentionMapper;
import com.college.labselect.mapper.InterviewScheduleMapper;
import com.college.labselect.mapper.InterviewSessionInterviewerMapper;
import com.college.labselect.mapper.InterviewSessionMapper;
import com.college.labselect.mapper.LabMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.SelectionRoundMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.service.impl.InterviewScheduleServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 面试排期服务单元测试，阶段 3 以红灯作为阶段 4 的编码边界。
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class InterviewScheduleServiceTest {

    @Mock
    private InterviewSessionMapper interviewSessionMapper;

    @Mock
    private InterviewScheduleMapper interviewScheduleMapper;

    @Mock
    private IntentionMapper intentionMapper;

    @Mock
    private IntentionItemMapper intentionItemMapper;

    @Mock
    private SysUserMapper sysUserMapper;

    @Mock
    private LabMapper labMapper;

    @Mock
    private MentorProfileMapper mentorProfileMapper;

    @Mock
    private SelectionRoundMapper selectionRoundMapper;

    @Mock
    private InterviewSessionInterviewerMapper interviewerMapper;

    @InjectMocks
    private InterviewScheduleServiceImpl interviewScheduleService;

    /**
     * 边界：手工调整导致学生时间冲突返回 409001。
     */
    @Test
    void adjustSchedules_studentConflict_shouldThrow409001() {
        when(labMapper.selectOne(any())).thenReturn(lab());
        when(selectionRoundMapper.selectById(1L)).thenReturn(round());
        when(interviewSessionMapper.selectList(any())).thenReturn(List.of(
                session(1L, 14, 0, 15, 30, 30),
                session(2L, 14, 30, 16, 0, 30)));
        when(interviewScheduleMapper.selectList(any())).thenReturn(List.of(
                schedule(1L, 1L, 1001L),
                schedule(2L, 2L, 1001L)));

        ScheduleAdjustReqDTO req = new ScheduleAdjustReqDTO();
        req.setRoundId(1L);
        ScheduleItemReqDTO item = new ScheduleItemReqDTO();
        item.setScheduleId(2L);
        item.setSessionId(1L);
        req.setItems(List.of(item));

        BusinessException exception = catchThrowableOfType(
                () -> interviewScheduleService.adjustSchedules(2001L, req), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(409001);
    }

    /**
     * 快乐路径：学生本人可看到多条面试安排。
     */
    @Test
    void listStudentInterviews_shouldReturnSessions() {
        InterviewSession first = session(1L, 14, 0, 15, 30, 30);
        first.setStatus(2);
        InterviewSession second = session(2L, 15, 30, 17, 0, 30);
        second.setStatus(2);
        when(interviewScheduleMapper.selectList(any())).thenReturn(List.of(
                schedule(1L, 1L, 1001L),
                schedule(2L, 2L, 1001L)));
        when(interviewSessionMapper.selectBatchIds(any())).thenReturn(List.of(first, second));

        var result = interviewScheduleService.listStudentInterviews(1001L, 1L);

        assertThat(result).hasSize(2);
    }

    /**
     * 快乐路径：自动分配为本室意向学生生成排期。
     */
    @Test
    void autoSchedule_shouldAssignStudents() {
        when(labMapper.selectOne(any())).thenReturn(lab());
        when(selectionRoundMapper.selectById(1L)).thenReturn(round());
        when(interviewSessionMapper.selectList(any())).thenReturn(List.of(
                session(1L, 14, 0, 15, 30, 5)));
        when(intentionMapper.selectList(any())).thenReturn(List.of(intention(61L, 1001L)));
        when(intentionItemMapper.selectList(any())).thenReturn(List.of(intentionItem(61L, 11L)));
        when(interviewScheduleMapper.selectList(any())).thenReturn(List.of());
        when(mentorProfileMapper.selectList(any())).thenReturn(List.of(mentor()));

        interviewScheduleService.autoSchedule(2001L, 1L);

        verify(interviewScheduleMapper).insert(any(InterviewSchedule.class));
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
        return round;
    }

    private Intention intention(Long id, Long studentId) {
        Intention intention = new Intention();
        intention.setId(id);
        intention.setRoundId(1L);
        intention.setStudentId(studentId);
        intention.setStatus(2);
        return intention;
    }

    private IntentionItem intentionItem(Long intentionId, Long mentorId) {
        IntentionItem item = new IntentionItem();
        item.setIntentionId(intentionId);
        item.setMentorId(mentorId);
        item.setLabId(1L);
        return item;
    }

    private MentorProfile mentor() {
        MentorProfile mentor = new MentorProfile();
        mentor.setId(11L);
        mentor.setUserId(2001L);
        mentor.setLabId(1L);
        return mentor;
    }

    private InterviewSession session(Long id, int startHour, int startMinute,
                                     int endHour, int endMinute, int capacity) {
        InterviewSession session = new InterviewSession();
        session.setId(id);
        session.setRoundId(1L);
        session.setLabId(1L);
        session.setSessionName("第" + id + "场");
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
}
