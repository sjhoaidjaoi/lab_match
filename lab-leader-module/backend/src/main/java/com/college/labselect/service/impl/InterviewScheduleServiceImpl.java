package com.college.labselect.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.college.labselect.common.DesensitizeUtils;
import com.college.labselect.common.InterviewTimeUtils;
import com.college.labselect.common.ResultCode;
import com.college.labselect.common.StatusTextUtils;
import com.college.labselect.dto.req.ScheduleAdjustReqDTO;
import com.college.labselect.dto.req.ScheduleItemReqDTO;
import com.college.labselect.dto.resp.InterviewScheduleVO;
import com.college.labselect.dto.resp.StudentInterviewVO;
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
import com.college.labselect.service.IInterviewScheduleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 面试排期服务实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InterviewScheduleServiceImpl implements IInterviewScheduleService {

    private static final int SESSION_DRAFT = 1;
    private static final int SESSION_PUBLISHED = 2;
    private static final int INTENTION_SUBMITTED = 2;
    private static final int SCHEDULE_PENDING = 1;

    private final InterviewSessionMapper interviewSessionMapper;
    private final InterviewScheduleMapper interviewScheduleMapper;
    private final InterviewSessionInterviewerMapper interviewerMapper;
    private final IntentionMapper intentionMapper;
    private final IntentionItemMapper intentionItemMapper;
    private final SysUserMapper sysUserMapper;
    private final LabMapper labMapper;
    private final MentorProfileMapper mentorProfileMapper;
    private final SelectionRoundMapper selectionRoundMapper;

    @Override
    public List<InterviewScheduleVO> listSchedules(Long leaderUserId, Long roundId) {
        Lab lab = requireLab(leaderUserId);
        Long targetRoundId = resolveRoundId(roundId);
        if (targetRoundId == null) {
            return List.of();
        }
        List<InterviewSchedule> schedules = interviewScheduleMapper.selectList(
                new LambdaQueryWrapper<InterviewSchedule>()
                        .eq(InterviewSchedule::getRoundId, targetRoundId)
                        .eq(InterviewSchedule::getLabId, lab.getId())
                        .orderByAsc(InterviewSchedule::getId));
        if (schedules.isEmpty()) {
            return List.of();
        }
        Map<Long, InterviewSession> sessionMap = loadSessions(schedules.stream()
                .map(InterviewSchedule::getSessionId).distinct().toList());
        Map<Long, SysUser> studentMap = loadUsers(schedules.stream()
                .map(InterviewSchedule::getStudentId).distinct().toList());
        List<InterviewScheduleVO> result = new ArrayList<>();
        for (InterviewSchedule schedule : schedules) {
            InterviewSession session = sessionMap.get(schedule.getSessionId());
            SysUser student = studentMap.get(schedule.getStudentId());
            InterviewScheduleVO vo = new InterviewScheduleVO();
            vo.setId(schedule.getId());
            vo.setRoundId(schedule.getRoundId());
            vo.setLabId(schedule.getLabId());
            vo.setLabName(lab.getLabName());
            vo.setSessionId(schedule.getSessionId());
            vo.setSessionName(session == null ? "" : session.getSessionName());
            vo.setInterviewDate(session == null ? null : session.getInterviewDate());
            vo.setStartTime(session == null ? null : session.getStartTime());
            vo.setEndTime(session == null ? null : session.getEndTime());
            vo.setStudentId(schedule.getStudentId());
            vo.setStudentNo(student == null ? "" : DesensitizeUtils.maskUserNo(student.getUserNo()));
            vo.setStudentName(student == null ? "" : DesensitizeUtils.maskName(student.getRealName()));
            vo.setStatus(schedule.getStatus());
            vo.setStatusText(StatusTextUtils.interviewScheduleStatus(schedule.getStatus()));
            result.add(vo);
        }
        result.sort(Comparator.comparing(InterviewScheduleVO::getInterviewDate,
                        Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(InterviewScheduleVO::getStartTime,
                        Comparator.nullsLast(Comparator.naturalOrder())));
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void autoSchedule(Long leaderUserId, Long roundId) {
        Lab lab = requireLab(leaderUserId);
        SelectionRound round = selectionRoundMapper.selectById(roundId);
        if (round == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "选拔轮次不存在");
        }
        List<InterviewSession> sessions = interviewSessionMapper.selectList(
                new LambdaQueryWrapper<InterviewSession>()
                        .eq(InterviewSession::getRoundId, roundId)
                        .eq(InterviewSession::getLabId, lab.getId())
                        .eq(InterviewSession::getStatus, SESSION_DRAFT)
                        .orderByAsc(InterviewSession::getInterviewDate)
                        .orderByAsc(InterviewSession::getStartTime));
        if (sessions.isEmpty()) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "请先创建面试场次");
        }
        List<Intention> intentions = intentionMapper.selectList(new LambdaQueryWrapper<Intention>()
                .eq(Intention::getRoundId, roundId)
                .eq(Intention::getStatus, INTENTION_SUBMITTED));
        if (intentions.isEmpty()) {
            return;
        }
        List<Long> intentionIds = intentions.stream().map(Intention::getId).toList();
        Map<Long, Long> intentionStudentMap = intentions.stream()
                .collect(Collectors.toMap(Intention::getId, Intention::getStudentId,
                        (first, second) -> first));
        List<IntentionItem> items = intentionItemMapper.selectList(new LambdaQueryWrapper<IntentionItem>()
                .in(IntentionItem::getIntentionId, intentionIds)
                .eq(IntentionItem::getLabId, lab.getId()));
        if (items.isEmpty()) {
            return;
        }
        Map<Long, List<Long>> studentMentors = items.stream()
                .filter(item -> intentionStudentMap.containsKey(item.getIntentionId()))
                .collect(Collectors.groupingBy(item -> intentionStudentMap.get(item.getIntentionId()),
                        Collectors.mapping(IntentionItem::getMentorId, Collectors.toList())));
        List<Long> studentIds = studentMentors.keySet().stream().sorted().toList();
        List<InterviewSchedule> existing = interviewScheduleMapper.selectList(
                new LambdaQueryWrapper<InterviewSchedule>()
                        .eq(InterviewSchedule::getRoundId, roundId)
                        .eq(InterviewSchedule::getLabId, lab.getId()));
        Set<Long> existingStudents = existing.stream()
                .map(InterviewSchedule::getStudentId)
                .collect(Collectors.toSet());
        Map<Long, Integer> remaining = new HashMap<>();
        for (InterviewSession session : sessions) {
            remaining.put(session.getId(), Optional.ofNullable(session.getCapacity()).orElse(0));
        }
        for (InterviewSchedule schedule : existing) {
            remaining.computeIfPresent(schedule.getSessionId(), (key, value) -> value - 1);
        }
        Map<Long, Set<Long>> sessionMentorIds = loadSessionMentorIds(sessions, lab.getId());
        for (Long studentId : studentIds) {
            if (existingStudents.contains(studentId)) {
                continue;
            }
            Set<Long> mentorIds = new HashSet<>(studentMentors.getOrDefault(studentId, List.of()));
            InterviewSession target = sessions.stream()
                    .filter(session -> remaining.getOrDefault(session.getId(), 0) > 0)
                    .sorted(Comparator.comparingInt(session ->
                            sessionMentorIds.getOrDefault(session.getId(), Set.of()).stream()
                                    .anyMatch(mentorIds::contains) ? 0 : 1))
                    .findFirst()
                    .orElseThrow(() -> new BusinessException(ResultCode.BUSINESS_ERROR,
                            "场次容量不足，无法完成自动分配"));
            InterviewSchedule schedule = new InterviewSchedule();
            schedule.setRoundId(roundId);
            schedule.setLabId(lab.getId());
            schedule.setSessionId(target.getId());
            schedule.setStudentId(studentId);
            schedule.setStatus(SCHEDULE_PENDING);
            interviewScheduleMapper.insert(schedule);
            remaining.merge(target.getId(), -1, Integer::sum);
        }
        log.info("自动分配面试排期，labId={}，roundId={}，studentCount={}", lab.getId(), roundId, studentIds.size());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void adjustSchedules(Long leaderUserId, ScheduleAdjustReqDTO req) {
        Lab lab = requireLab(leaderUserId);
        SelectionRound round = selectionRoundMapper.selectById(req.getRoundId());
        if (round == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "选拔轮次不存在");
        }
        Map<Long, InterviewSession> sessionMap = interviewSessionMapper.selectList(
                        new LambdaQueryWrapper<InterviewSession>()
                                .eq(InterviewSession::getRoundId, req.getRoundId())
                                .eq(InterviewSession::getLabId, lab.getId()))
                .stream()
                .collect(Collectors.toMap(InterviewSession::getId, Function.identity(), (first, second) -> first));
        Map<Long, InterviewSchedule> scheduleMap = interviewScheduleMapper.selectList(
                        new LambdaQueryWrapper<InterviewSchedule>()
                                .eq(InterviewSchedule::getRoundId, req.getRoundId())
                                .eq(InterviewSchedule::getLabId, lab.getId()))
                .stream()
                .collect(Collectors.toMap(InterviewSchedule::getId, Function.identity(), (first, second) -> first));
        List<InterviewSchedule> changed = new ArrayList<>();
        for (ScheduleItemReqDTO item : req.getItems()) {
            InterviewSchedule schedule = scheduleMap.get(item.getScheduleId());
            if (schedule == null) {
                throw new BusinessException(ResultCode.NOT_FOUND, "面试排期不存在");
            }
            if (!Objects.equals(schedule.getLabId(), lab.getId())) {
                throw new BusinessException(ResultCode.FORBIDDEN, "无权调整其他实训室的排期");
            }
            InterviewSession target = sessionMap.get(item.getSessionId());
            if (target == null) {
                throw new BusinessException(ResultCode.NOT_FOUND, "目标场次不存在");
            }
            if (!Integer.valueOf(SESSION_DRAFT).equals(target.getStatus())) {
                throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "已发布场次不可调整");
            }
            schedule.setSessionId(target.getId());
            changed.add(schedule);
        }
        Map<Long, List<InterviewSchedule>> byStudent = scheduleMap.values().stream()
                .collect(Collectors.groupingBy(InterviewSchedule::getStudentId));
        checkStudentConflict(byStudent, sessionMap);
        checkCapacity(byStudent, sessionMap);
        for (InterviewSchedule schedule : changed) {
            interviewScheduleMapper.updateById(schedule);
        }
        log.info("手工调整面试排期，labId={}，roundId={}，count={}", lab.getId(), req.getRoundId(), changed.size());
    }

    @Override
    public List<StudentInterviewVO> listStudentInterviews(Long studentUserId, Long roundId) {
        Long targetRoundId = resolveRoundId(roundId);
        if (targetRoundId == null) {
            return List.of();
        }
        List<InterviewSchedule> schedules = interviewScheduleMapper.selectList(
                new LambdaQueryWrapper<InterviewSchedule>()
                        .eq(InterviewSchedule::getRoundId, targetRoundId)
                        .eq(InterviewSchedule::getStudentId, studentUserId)
                        .orderByAsc(InterviewSchedule::getId));
        if (schedules.isEmpty()) {
            return List.of();
        }
        Map<Long, InterviewSession> sessionMap = loadSessions(schedules.stream()
                .map(InterviewSchedule::getSessionId).distinct().toList());
        List<Long> publishedIds = sessionMap.values().stream()
                .filter(session -> Integer.valueOf(SESSION_PUBLISHED).equals(session.getStatus()))
                .map(InterviewSession::getId)
                .toList();
        if (publishedIds.isEmpty()) {
            return List.of();
        }
        Map<Long, List<Long>> interviewerIds = loadInterviewerIds(publishedIds);
        Map<Long, SysUser> interviewerMap = loadUsers(interviewerIds.values().stream()
                .flatMap(List::stream).distinct().toList());
        Map<Long, Lab> labMap = loadLabs(schedules.stream().map(InterviewSchedule::getLabId).distinct().toList());
        SelectionRound round = selectionRoundMapper.selectById(targetRoundId);
        List<StudentInterviewVO> result = new ArrayList<>();
        for (InterviewSchedule schedule : schedules) {
            InterviewSession session = sessionMap.get(schedule.getSessionId());
            if (session == null || !publishedIds.contains(session.getId())) {
                continue;
            }
            Lab lab = labMap.get(schedule.getLabId());
            StudentInterviewVO vo = new StudentInterviewVO();
            vo.setId(schedule.getId());
            vo.setRoundNo(round == null ? null : round.getRoundNo());
            vo.setLabId(schedule.getLabId());
            vo.setLabName(lab == null ? "" : lab.getLabName());
            vo.setSessionName(session.getSessionName());
            vo.setInterviewDate(session.getInterviewDate());
            vo.setStartTime(session.getStartTime());
            vo.setEndTime(session.getEndTime());
            vo.setLocation(session.getLocation());
            vo.setInterviewers(interviewerIds.getOrDefault(session.getId(), List.of()).stream()
                    .map(interviewerMap::get)
                    .filter(Objects::nonNull)
                    .map(SysUser::getRealName)
                    .toList());
            vo.setNote("请提前 10 分钟到场");
            vo.setStatus(schedule.getStatus());
            vo.setStatusText(StatusTextUtils.interviewScheduleStatus(schedule.getStatus()));
            result.add(vo);
        }
        result.sort(Comparator.comparing(StudentInterviewVO::getInterviewDate,
                        Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(StudentInterviewVO::getStartTime,
                        Comparator.nullsLast(Comparator.naturalOrder())));
        return result;
    }

    /**
     * 校验学生时段冲突。
     *
     * @param byStudent  学生排期分组
     * @param sessionMap 场次映射
     */
    private void checkStudentConflict(Map<Long, List<InterviewSchedule>> byStudent,
                                      Map<Long, InterviewSession> sessionMap) {
        for (List<InterviewSchedule> schedules : byStudent.values()) {
            for (int i = 0; i < schedules.size(); i++) {
                for (int j = i + 1; j < schedules.size(); j++) {
                    InterviewSession first = sessionMap.get(schedules.get(i).getSessionId());
                    InterviewSession second = sessionMap.get(schedules.get(j).getSessionId());
                    if (first != null && second != null && InterviewTimeUtils.overlap(first, second)) {
                        throw new BusinessException(ResultCode.DUPLICATE_SUBMIT, "存在学生时间冲突");
                    }
                }
            }
        }
    }

    /**
     * 校验场次容量。
     *
     * @param byStudent  学生排期分组
     * @param sessionMap 场次映射
     */
    private void checkCapacity(Map<Long, List<InterviewSchedule>> byStudent,
                               Map<Long, InterviewSession> sessionMap) {
        Map<Long, Integer> counts = new HashMap<>();
        byStudent.values().stream()
                .flatMap(List::stream)
                .forEach(schedule -> counts.merge(schedule.getSessionId(), 1, Integer::sum));
        for (Map.Entry<Long, Integer> entry : counts.entrySet()) {
            InterviewSession session = sessionMap.get(entry.getKey());
            if (session != null && session.getCapacity() != null && entry.getValue() > session.getCapacity()) {
                throw new BusinessException(ResultCode.BUSINESS_ERROR, "场次超出容量");
            }
        }
    }

    /**
     * 加载场次对应的意向导师集合。
     *
     * @param sessions 场次列表
     * @param labId    实训室 ID
     * @return 场次 ID 到导师档案 ID 集合的映射
     */
    private Map<Long, Set<Long>> loadSessionMentorIds(List<InterviewSession> sessions, Long labId) {
        Map<Long, Long> userMentorMap = mentorProfileMapper.selectList(new LambdaQueryWrapper<MentorProfile>()
                        .eq(MentorProfile::getLabId, labId))
                .stream()
                .filter(mentor -> mentor.getUserId() != null)
                .collect(Collectors.toMap(MentorProfile::getUserId, MentorProfile::getId,
                        (first, second) -> first));
        Map<Long, Set<Long>> result = new HashMap<>();
        for (InterviewSessionInterviewer interviewer : interviewerMapper.selectList(
                new LambdaQueryWrapper<InterviewSessionInterviewer>()
                        .in(InterviewSessionInterviewer::getSessionId,
                                sessions.stream().map(InterviewSession::getId).toList()))) {
            Long mentorId = userMentorMap.get(interviewer.getInterviewerId());
            if (mentorId != null) {
                result.computeIfAbsent(interviewer.getSessionId(), key -> new HashSet<>()).add(mentorId);
            }
        }
        return result;
    }

    /**
     * 查询负责人所在实训室。
     *
     * @param leaderUserId 负责人用户 ID
     * @return 实训室
     */
    private Lab requireLab(Long leaderUserId) {
        Lab lab = labMapper.selectOne(new LambdaQueryWrapper<Lab>().eq(Lab::getLeaderId, leaderUserId));
        if (lab == null) {
            throw new BusinessException(ResultCode.FORBIDDEN, "仅实训室负责人可操作面试排期");
        }
        return lab;
    }

    /**
     * 按 ID 或最近轮次解析轮次 ID。
     *
     * @param roundId 轮次 ID，可为空
     * @return 轮次 ID，可能为空
     */
    private Long resolveRoundId(Long roundId) {
        if (roundId != null) {
            return roundId;
        }
        SelectionRound round = selectionRoundMapper.selectOne(new LambdaQueryWrapper<SelectionRound>()
                .orderByDesc(SelectionRound::getRoundNo)
                .last("LIMIT 1"));
        return round == null ? null : round.getId();
    }

    /**
     * 批量加载场次。
     *
     * @param sessionIds 场次 ID 列表
     * @return 场次映射
     */
    private Map<Long, InterviewSession> loadSessions(List<Long> sessionIds) {
        if (sessionIds.isEmpty()) {
            return new HashMap<>();
        }
        return interviewSessionMapper.selectBatchIds(sessionIds).stream()
                .collect(Collectors.toMap(InterviewSession::getId, Function.identity(), (first, second) -> first));
    }

    /**
     * 批量加载用户。
     *
     * @param userIds 用户 ID 列表
     * @return 用户映射
     */
    private Map<Long, SysUser> loadUsers(List<Long> userIds) {
        if (userIds.isEmpty()) {
            return new HashMap<>();
        }
        return sysUserMapper.selectBatchIds(userIds).stream()
                .collect(Collectors.toMap(SysUser::getId, Function.identity(), (first, second) -> first));
    }

    /**
     * 批量加载实训室。
     *
     * @param labIds 实训室 ID 列表
     * @return 实训室映射
     */
    private Map<Long, Lab> loadLabs(List<Long> labIds) {
        if (labIds.isEmpty()) {
            return new HashMap<>();
        }
        return labMapper.selectBatchIds(labIds).stream()
                .collect(Collectors.toMap(Lab::getId, Function.identity(), (first, second) -> first));
    }

    /**
     * 加载场次面试官映射。
     *
     * @param sessionIds 场次 ID 列表
     * @return 场次 ID 到面试官 ID 列表的映射
     */
    private Map<Long, List<Long>> loadInterviewerIds(List<Long> sessionIds) {
        if (sessionIds.isEmpty()) {
            return new HashMap<>();
        }
        return interviewerMapper.selectList(new LambdaQueryWrapper<InterviewSessionInterviewer>()
                        .in(InterviewSessionInterviewer::getSessionId, sessionIds))
                .stream()
                .collect(Collectors.groupingBy(InterviewSessionInterviewer::getSessionId,
                        Collectors.mapping(InterviewSessionInterviewer::getInterviewerId, Collectors.toList())));
    }
}
