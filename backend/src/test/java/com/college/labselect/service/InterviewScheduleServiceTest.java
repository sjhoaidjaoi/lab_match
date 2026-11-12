package com.college.labselect.service;

import com.college.labselect.dto.req.ScheduleAdjustReqDTO;
import com.college.labselect.dto.req.ScheduleAssignReqDTO;
import com.college.labselect.dto.req.ScheduleItemReqDTO;
import com.college.labselect.dto.resp.UnassignedStudentVO;
import com.college.labselect.entity.Intention;
import com.college.labselect.entity.IntentionItem;
import com.college.labselect.entity.InterviewSchedule;
import com.college.labselect.entity.InterviewSession;
import com.college.labselect.entity.InterviewSessionInterviewer;
import com.college.labselect.entity.Lab;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.entity.SysUser;
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
        when(mentorProfileMapper.selectList(any())).thenReturn(List.of(mentor()));
        when(interviewerMapper.selectList(any())).thenReturn(List.of(
                interviewer(1L), interviewer(2L)));

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
        when(mentorProfileMapper.selectBatchIds(any())).thenReturn(List.of(mentor()));
        when(interviewerMapper.selectList(any())).thenReturn(List.of(interviewer(1L)));
        when(sysUserMapper.selectBatchIds(any())).thenReturn(List.of(user(2001L, "20010001", "李海峰")));

        interviewScheduleService.autoSchedule(2001L, 1L);

        verify(interviewScheduleMapper).insert(any(InterviewSchedule.class));
    }

    /**
     * 快乐路径：待排学生列表排除已排期学生。
     */
    @Test
    void listUnassignedStudents_shouldExcludeScheduled() {
        when(labMapper.selectOne(any())).thenReturn(lab());
        when(intentionMapper.selectList(any())).thenReturn(List.of(
                intention(61L, 1001L), intention(62L, 1002L)));
        when(intentionItemMapper.selectList(any())).thenReturn(List.of(
                intentionItem(61L, 11L), intentionItem(62L, 11L)));
        when(interviewScheduleMapper.selectList(any())).thenReturn(List.of(
                schedule(1L, 1L, 1001L)));
        when(mentorProfileMapper.selectBatchIds(any())).thenReturn(List.of(mentor()));
        when(sysUserMapper.selectBatchIds(any())).thenReturn(List.of(
                user(1001L, "20220001", "陈爱丽"),
                user(1002L, "20220002", "张强"),
                user(2001L, "20010001", "李海峰")));

        List<UnassignedStudentVO> result = interviewScheduleService.listUnassignedStudents(2001L, 1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStudentId()).isEqualTo(1002L);
        assertThat(result.get(0).getMentorId()).isEqualTo(11L);
        assertThat(result.get(0).getMentorName()).isEqualTo("李海峰");
    }

    /**
     * 快乐路径：未排期学生拖入草稿场次生成排期。
     */
    @Test
    void assignSchedule_success_shouldInsertSchedule() {
        when(labMapper.selectOne(any())).thenReturn(lab());
        when(selectionRoundMapper.selectById(1L)).thenReturn(round());
        when(interviewSessionMapper.selectById(1L)).thenReturn(session(1L, 14, 0, 15, 30, 30));
        when(mentorProfileMapper.selectById(11L)).thenReturn(mentor());
        when(interviewerMapper.selectCount(any())).thenReturn(1L);
        when(intentionMapper.selectOne(any())).thenReturn(intention(61L, 1001L));
        when(intentionItemMapper.selectCount(any())).thenReturn(1L);
        when(interviewScheduleMapper.selectCount(any())).thenReturn(0L);
        when(interviewScheduleMapper.selectList(any())).thenReturn(List.of());
        when(interviewScheduleMapper.insert(any(InterviewSchedule.class))).thenAnswer(invocation -> {
            InterviewSchedule schedule = invocation.getArgument(0);
            schedule.setId(801L);
            return 1;
        });

        Long id = interviewScheduleService.assignSchedule(2001L, assignReq());

        assertThat(id).isEqualTo(801L);
        verify(interviewScheduleMapper).insert(any(InterviewSchedule.class));
    }

    /**
     * 边界：学生已在本室排期时再次分配返回 409001。
     */
    @Test
    void assignSchedule_duplicate_shouldThrow409001() {
        when(labMapper.selectOne(any())).thenReturn(lab());
        when(selectionRoundMapper.selectById(1L)).thenReturn(round());
        when(interviewSessionMapper.selectById(1L)).thenReturn(session(1L, 14, 0, 15, 30, 30));
        when(mentorProfileMapper.selectById(11L)).thenReturn(mentor());
        when(interviewerMapper.selectCount(any())).thenReturn(1L);
        when(intentionMapper.selectOne(any())).thenReturn(intention(61L, 1001L));
        when(intentionItemMapper.selectCount(any())).thenReturn(1L);
        when(interviewScheduleMapper.selectCount(any())).thenReturn(1L);

        BusinessException exception = catchThrowableOfType(
                () -> interviewScheduleService.assignSchedule(2001L, assignReq()), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(409001);
    }

    /**
     * 边界：目标场次与学生已有场次时间冲突返回 409001。
     */
    @Test
    void assignSchedule_timeConflict_shouldThrow409001() {
        when(labMapper.selectOne(any())).thenReturn(lab());
        when(selectionRoundMapper.selectById(1L)).thenReturn(round());
        when(interviewSessionMapper.selectById(1L)).thenReturn(session(1L, 14, 0, 15, 30, 30));
        when(interviewSessionMapper.selectBatchIds(any())).thenReturn(List.of(
                session(2L, 14, 30, 16, 0, 30)));
        when(mentorProfileMapper.selectById(11L)).thenReturn(mentor());
        when(interviewerMapper.selectCount(any())).thenReturn(1L);
        when(intentionMapper.selectOne(any())).thenReturn(intention(61L, 1001L));
        when(intentionItemMapper.selectCount(any())).thenReturn(1L);
        when(interviewScheduleMapper.selectCount(any())).thenReturn(0L);
        when(interviewScheduleMapper.selectList(any())).thenReturn(List.of(
                schedule(2L, 2L, 1001L)));

        BusinessException exception = catchThrowableOfType(
                () -> interviewScheduleService.assignSchedule(2001L, assignReq()), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(409001);
    }

    /**
     * 快乐路径：登记面试状态为已完成。
     */
    @Test
    void updateScheduleStatus_success_shouldUpdateStatus() {
        when(labMapper.selectOne(any())).thenReturn(lab());
        when(interviewScheduleMapper.selectById(801L)).thenReturn(schedule(801L, 1L, 1001L));
        when(selectionRoundMapper.selectById(1L)).thenReturn(round());
        when(interviewScheduleMapper.updateById(any(InterviewSchedule.class))).thenReturn(1);

        interviewScheduleService.updateScheduleStatus(2001L, 801L, 2);

        verify(interviewScheduleMapper).updateById(any(InterviewSchedule.class));
    }

    /**
     * 边界：登记其他实训室排期状态返回 403001。
     */
    @Test
    void updateScheduleStatus_otherLab_shouldThrow403001() {
        InterviewSchedule other = schedule(801L, 1L, 1001L);
        other.setLabId(2L);
        when(labMapper.selectOne(any())).thenReturn(lab());
        when(interviewScheduleMapper.selectById(801L)).thenReturn(other);

        BusinessException exception = catchThrowableOfType(
                () -> interviewScheduleService.updateScheduleStatus(2001L, 801L, 2),
                BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(403001);
    }

    /**
     * 边界：面试状态仅支持已完成或缺席。
     */
    @Test
    void updateScheduleStatus_invalidStatus_shouldThrow400001() {
        when(labMapper.selectOne(any())).thenReturn(lab());
        when(interviewScheduleMapper.selectById(801L)).thenReturn(schedule(801L, 1L, 1001L));

        BusinessException exception = catchThrowableOfType(
                () -> interviewScheduleService.updateScheduleStatus(2001L, 801L, 1),
                BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400001);
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
        mentor.setStatus(1);
        return mentor;
    }

    private InterviewSessionInterviewer interviewer(Long sessionId) {
        InterviewSessionInterviewer interviewer = new InterviewSessionInterviewer();
        interviewer.setSessionId(sessionId);
        interviewer.setInterviewerId(2001L);
        return interviewer;
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
        schedule.setMentorId(11L);
        schedule.setSessionId(sessionId);
        schedule.setStudentId(studentId);
        schedule.setStatus(1);
        return schedule;
    }

    private ScheduleAssignReqDTO assignReq() {
        ScheduleAssignReqDTO req = new ScheduleAssignReqDTO();
        req.setRoundId(1L);
        req.setStudentId(1001L);
        req.setMentorId(11L);
        req.setSessionId(1L);
        return req;
    }

    private SysUser user(Long id, String userNo, String realName) {
        SysUser user = new SysUser();
        user.setId(id);
        user.setUserNo(userNo);
        user.setRealName(realName);
        user.setStatus(1);
        return user;
    }
}
