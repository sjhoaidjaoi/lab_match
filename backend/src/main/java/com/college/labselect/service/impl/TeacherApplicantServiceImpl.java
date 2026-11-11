package com.college.labselect.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.college.labselect.common.DesensitizeUtils;
import com.college.labselect.common.ResultCode;
import com.college.labselect.common.StatusTextUtils;
import com.college.labselect.dto.resp.LeaderApplicantMentorVO;
import com.college.labselect.dto.resp.LeaderApplicantPageVO;
import com.college.labselect.dto.resp.LeaderApplicantVO;
import com.college.labselect.dto.resp.TeacherApplicantPageVO;
import com.college.labselect.dto.resp.TeacherApplicantVO;
import com.college.labselect.dto.resp.TeacherStudentArchiveVO;
import com.college.labselect.entity.Admission;
import com.college.labselect.entity.Intention;
import com.college.labselect.entity.IntentionItem;
import com.college.labselect.entity.InterviewScore;
import com.college.labselect.entity.InterviewSchedule;
import com.college.labselect.entity.InterviewSession;
import com.college.labselect.entity.Lab;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.entity.StudentProfile;
import com.college.labselect.entity.SysUser;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.AdmissionMapper;
import com.college.labselect.mapper.IntentionItemMapper;
import com.college.labselect.mapper.IntentionMapper;
import com.college.labselect.mapper.InterviewScoreMapper;
import com.college.labselect.mapper.InterviewScheduleMapper;
import com.college.labselect.mapper.InterviewSessionMapper;
import com.college.labselect.mapper.LabMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.SelectionRoundMapper;
import com.college.labselect.mapper.StudentProfileMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.service.ITeacherApplicantService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 导师报名学生服务实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TeacherApplicantServiceImpl implements ITeacherApplicantService {

    private static final int INTENTION_SUBMITTED = 2;
    private static final int MENTOR_ENABLED = 1;
    private static final long MAX_PAGE_SIZE = 100L;

    private final SelectionRoundMapper selectionRoundMapper;
    private final MentorProfileMapper mentorProfileMapper;
    private final IntentionMapper intentionMapper;
    private final IntentionItemMapper intentionItemMapper;
    private final SysUserMapper sysUserMapper;
    private final InterviewScheduleMapper interviewScheduleMapper;
    private final InterviewSessionMapper interviewSessionMapper;
    private final InterviewScoreMapper interviewScoreMapper;
    private final AdmissionMapper admissionMapper;
    private final StudentProfileMapper studentProfileMapper;
    private final LabMapper labMapper;

    @Override
    public TeacherApplicantPageVO listApplicants(Long teacherUserId, Integer interviewStatus, Integer scoreStatus,
                                                 String keyword, long pageNum, long pageSize) {
        long safePage = Math.max(1, pageNum);
        long safeSize = pageSize < 1 ? 10 : Math.min(pageSize, MAX_PAGE_SIZE);
        TeacherApplicantPageVO result = new TeacherApplicantPageVO();
        result.setVisible(0);
        result.setTotal(0L);
        result.setPageNum(safePage);
        result.setPageSize(safeSize);
        result.setList(new ArrayList<>());
        MentorProfile mentor = requireMentor(teacherUserId);
        SelectionRound round = currentRound();
        if (!applyFinished(round)) {
            return result;
        }
        result.setVisible(1);
        List<Intention> intentions = intentionMapper.selectList(new LambdaQueryWrapper<Intention>()
                .eq(Intention::getRoundId, round.getId())
                .eq(Intention::getStatus, INTENTION_SUBMITTED));
        if (intentions.isEmpty()) {
            return result;
        }
        List<IntentionItem> items = intentionItemMapper.selectList(new LambdaQueryWrapper<IntentionItem>()
                .in(IntentionItem::getIntentionId, intentions.stream().map(Intention::getId).toList())
                .eq(IntentionItem::getMentorId, mentor.getId()));
        if (items.isEmpty()) {
            return result;
        }
        Map<Long, Long> studentByIntention = intentions.stream()
                .collect(Collectors.toMap(Intention::getId, Intention::getStudentId, (first, second) -> first));
        List<Long> studentIds = items.stream()
                .map(item -> studentByIntention.get(item.getIntentionId()))
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        Map<Long, SysUser> userMap = loadUsers(studentIds);
        Map<Long, InterviewSchedule> scheduleMap = loadMentorSchedules(round.getId(), mentor.getId(), studentIds);
        Map<Long, InterviewSession> sessionMap = loadSessions(scheduleMap.values().stream()
                .map(InterviewSchedule::getSessionId).distinct().toList());
        Map<Long, InterviewScore> scoreMap = loadMentorScores(round.getId(), mentor.getId(), studentIds);
        Map<Long, Admission> admissionMap = loadAdmissions(round.getId(), studentIds);
        String text = StrUtil.trim(keyword);
        List<TeacherApplicantVO> all = new ArrayList<>();
        for (Long studentId : studentIds) {
            SysUser student = userMap.get(studentId);
            if (StrUtil.isNotBlank(text)
                    && !StrUtil.containsIgnoreCase(student == null ? "" : student.getUserNo(), text)
                    && !StrUtil.containsIgnoreCase(student == null ? "" : student.getRealName(), text)) {
                continue;
            }
            InterviewSchedule schedule = scheduleMap.get(studentId);
            Integer currentInterviewStatus = schedule == null ? null : schedule.getStatus();
            if (interviewStatus != null && !interviewStatus.equals(currentInterviewStatus)) {
                continue;
            }
            InterviewScore score = scoreMap.get(studentId);
            Integer currentScoreStatus = score == null ? null : score.getStatus();
            if (scoreStatus != null && !scoreStatus.equals(currentScoreStatus)) {
                continue;
            }
            all.add(buildApplicant(student, schedule,
                    schedule == null ? null : sessionMap.get(schedule.getSessionId()), score,
                    admissionMap.get(studentId)));
        }
        int from = (int) Math.min((safePage - 1) * safeSize, all.size());
        int to = (int) Math.min(from + safeSize, all.size());
        result.setTotal((long) all.size());
        result.setList(new ArrayList<>(all.subList(from, to)));
        return result;
    }

    @Override
    public TeacherStudentArchiveVO getStudentArchive(Long teacherUserId, Long studentId) {
        MentorProfile mentor = requireMentor(teacherUserId);
        SelectionRound round = currentRound();
        if (!applyFinished(round)) {
            throw new BusinessException(ResultCode.FORBIDDEN, "填报截止后方可查看学生档案");
        }
        Intention intention = intentionMapper.selectOne(new LambdaQueryWrapper<Intention>()
                .eq(Intention::getRoundId, round.getId())
                .eq(Intention::getStudentId, studentId)
                .eq(Intention::getStatus, INTENTION_SUBMITTED));
        long intended = intention == null ? 0L : intentionItemMapper.selectCount(
                new LambdaQueryWrapper<IntentionItem>()
                        .eq(IntentionItem::getIntentionId, intention.getId())
                        .eq(IntentionItem::getMentorId, mentor.getId()));
        if (intended == 0) {
            throw new BusinessException(ResultCode.FORBIDDEN, "该生未将你列为意向");
        }
        SysUser student = sysUserMapper.selectById(studentId);
        if (student == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "学生不存在");
        }
        StudentProfile profile = studentProfileMapper.selectOne(new LambdaQueryWrapper<StudentProfile>()
                .eq(StudentProfile::getUserId, studentId));
        if (profile == null) {
            return null;
        }
        return buildArchive(student, profile);
    }

    @Override
    public LeaderApplicantPageVO listLeaderApplicants(Long leaderUserId, Long roundId, String keyword,
                                                      long pageNum, long pageSize) {
        long safePage = Math.max(1, pageNum);
        long safeSize = pageSize < 1 ? 10 : Math.min(pageSize, MAX_PAGE_SIZE);
        LeaderApplicantPageVO result = new LeaderApplicantPageVO();
        result.setVisible(0);
        result.setTotal(0L);
        result.setPageNum(safePage);
        result.setPageSize(safeSize);
        result.setList(new ArrayList<>());
        Lab lab = requireLeaderLab(leaderUserId);
        SelectionRound round = resolveRound(roundId);
        if (round == null || !applyFinished(round)) {
            return result;
        }
        result.setVisible(1);
        List<Intention> intentions = intentionMapper.selectList(new LambdaQueryWrapper<Intention>()
                .eq(Intention::getRoundId, round.getId())
                .eq(Intention::getStatus, INTENTION_SUBMITTED));
        if (intentions.isEmpty()) {
            return result;
        }
        Map<Long, Intention> intentionMap = intentions.stream()
                .collect(Collectors.toMap(Intention::getId, Function.identity(), (first, second) -> first));
        Map<Long, Intention> studentIntentionMap = intentions.stream()
                .collect(Collectors.toMap(Intention::getStudentId, Function.identity(), (first, second) -> first));
        List<IntentionItem> labItems = intentionItemMapper.selectList(new LambdaQueryWrapper<IntentionItem>()
                .in(IntentionItem::getIntentionId, intentionMap.keySet())
                .eq(IntentionItem::getLabId, lab.getId()));
        if (labItems.isEmpty()) {
            return result;
        }
        Set<Long> studentIds = labItems.stream()
                .map(item -> intentionMap.get(item.getIntentionId()))
                .filter(Objects::nonNull)
                .map(Intention::getStudentId)
                .collect(Collectors.toCollection(java.util.LinkedHashSet::new));
        List<IntentionItem> allItems = intentionItemMapper.selectList(new LambdaQueryWrapper<IntentionItem>()
                .in(IntentionItem::getIntentionId, intentionMap.keySet()));
        Map<Long, List<IntentionItem>> itemsByStudent = new HashMap<>();
        for (IntentionItem item : allItems) {
            Intention intention = intentionMap.get(item.getIntentionId());
            if (intention != null) {
                itemsByStudent.computeIfAbsent(intention.getStudentId(), key -> new ArrayList<>()).add(item);
            }
        }
        Map<Long, MentorProfile> mentorMap = loadMentors(allItems.stream()
                .map(IntentionItem::getMentorId).filter(Objects::nonNull).distinct().toList());
        Map<Long, SysUser> mentorUserMap = loadUsers(mentorMap.values().stream()
                .map(MentorProfile::getUserId).filter(Objects::nonNull).distinct().toList());
        Map<Long, Lab> labMap = loadLabs(allItems.stream()
                .map(IntentionItem::getLabId).filter(Objects::nonNull).distinct().toList());
        Map<Long, SysUser> userMap = loadUsers(new ArrayList<>(studentIds));
        Map<Long, InterviewSchedule> scheduleMap = loadSchedules(round.getId(), new ArrayList<>(studentIds));
        Map<Long, InterviewSession> sessionMap = loadSessions(scheduleMap.values().stream()
                .map(InterviewSchedule::getSessionId).distinct().toList());
        Map<Long, InterviewScore> scoreMap = loadScores(round.getId(), lab.getId(), new ArrayList<>(studentIds));
        Map<Long, Admission> admissionMap = loadLabAdmissions(round.getId(), lab.getId(),
                new ArrayList<>(studentIds));
        String text = StrUtil.trim(keyword);
        List<LeaderApplicantVO> all = new ArrayList<>();
        for (Long studentId : studentIds) {
            SysUser student = userMap.get(studentId);
            if (StrUtil.isNotBlank(text)
                    && !StrUtil.containsIgnoreCase(student == null ? "" : student.getUserNo(), text)
                    && !StrUtil.containsIgnoreCase(student == null ? "" : student.getRealName(), text)) {
                continue;
            }
            Intention intention = studentIntentionMap.get(studentId);
            LeaderApplicantVO vo = new LeaderApplicantVO();
            vo.setStudentId(studentId);
            vo.setStudentNo(student == null ? "" : DesensitizeUtils.maskUserNo(student.getUserNo()));
            vo.setStudentName(student == null ? "" : DesensitizeUtils.maskName(student.getRealName()));
            vo.setCollege(student == null ? "" : student.getCollege());
            vo.setMajor(student == null ? "" : student.getMajor());
            vo.setGrade(student == null ? "" : student.getGrade());
            vo.setAcceptInnerAdjust(intention == null ? 0 : intention.getAcceptInnerAdjust());
            vo.setAcceptCrossAdjust(intention == null ? 0 : intention.getAcceptCrossAdjust());
            List<LeaderApplicantMentorVO> mentorItems = new ArrayList<>();
            for (IntentionItem item : itemsByStudent.getOrDefault(studentId, List.of())) {
                MentorProfile mentor = mentorMap.get(item.getMentorId());
                SysUser mentorUser = mentor == null ? null : mentorUserMap.get(mentor.getUserId());
                Lab itemLab = labMap.get(item.getLabId());
                LeaderApplicantMentorVO mentorVO = new LeaderApplicantMentorVO();
                mentorVO.setMentorId(item.getMentorId());
                mentorVO.setMentorName(mentorUser == null ? "" : mentorUser.getRealName());
                mentorVO.setLabId(item.getLabId());
                mentorVO.setLabName(itemLab == null ? "" : itemLab.getLabName());
                mentorItems.add(mentorVO);
            }
            vo.setIntentions(mentorItems);
            InterviewSchedule schedule = scheduleMap.get(studentId);
            InterviewSession session = schedule == null ? null : sessionMap.get(schedule.getSessionId());
            if (session != null) {
                vo.setSessionName(session.getSessionName());
                vo.setInterviewDate(session.getInterviewDate());
            }
            if (schedule != null) {
                vo.setScheduleStatus(schedule.getStatus());
                vo.setScheduleStatusText(StatusTextUtils.interviewScheduleStatus(schedule.getStatus()));
            }
            InterviewScore score = scoreMap.get(studentId);
            if (score != null) {
                vo.setTotalScore(Optional.ofNullable(score.getFinalTotal()).orElse(score.getManualTotal()));
                vo.setScoreStatus(score.getStatus());
                vo.setScoreStatusText(StatusTextUtils.interviewScoreStatus(score.getStatus()));
            }
            Admission admission = admissionMap.get(studentId);
            if (admission != null) {
                vo.setAdmissionStatus(admission.getStatus());
                vo.setAdmissionStatusText(StatusTextUtils.admissionStatus(admission.getStatus()));
            }
            all.add(vo);
        }
        all.sort(Comparator.comparing(LeaderApplicantVO::getStudentId,
                Comparator.nullsLast(Comparator.naturalOrder())));
        int from = (int) Math.min((safePage - 1) * safeSize, all.size());
        int to = (int) Math.min(from + safeSize, all.size());
        result.setTotal((long) all.size());
        result.setList(new ArrayList<>(all.subList(from, to)));
        return result;
    }

    @Override
    public TeacherStudentArchiveVO getLeaderStudentArchive(Long leaderUserId, Long studentId, Long roundId) {
        Lab lab = requireLeaderLab(leaderUserId);
        SelectionRound round = resolveRound(roundId);
        if (round == null || !applyFinished(round)) {
            throw new BusinessException(ResultCode.FORBIDDEN, "填报截止后方可查看学生档案");
        }
        Intention intention = intentionMapper.selectOne(new LambdaQueryWrapper<Intention>()
                .eq(Intention::getRoundId, round.getId())
                .eq(Intention::getStudentId, studentId)
                .eq(Intention::getStatus, INTENTION_SUBMITTED));
        long intended = intention == null ? 0L : intentionItemMapper.selectCount(
                new LambdaQueryWrapper<IntentionItem>()
                        .eq(IntentionItem::getIntentionId, intention.getId())
                        .eq(IntentionItem::getLabId, lab.getId()));
        if (intended == 0) {
            throw new BusinessException(ResultCode.FORBIDDEN, "该学生未报名本实训室");
        }
        SysUser student = sysUserMapper.selectById(studentId);
        if (student == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "学生不存在");
        }
        StudentProfile profile = studentProfileMapper.selectOne(new LambdaQueryWrapper<StudentProfile>()
                .eq(StudentProfile::getUserId, studentId));
        if (profile == null) {
            return null;
        }
        return buildArchive(student, profile);
    }

    /**
     * 组装学生档案。
     *
     * @param student 学生账号
     * @param profile 学生档案
     * @return 档案视图
     */
    private TeacherStudentArchiveVO buildArchive(SysUser student, StudentProfile profile) {
        TeacherStudentArchiveVO vo = new TeacherStudentArchiveVO();
        vo.setUserNo(DesensitizeUtils.maskUserNo(student.getUserNo()));
        vo.setRealName(DesensitizeUtils.maskName(student.getRealName()));
        vo.setCollege(student.getCollege());
        vo.setMajor(student.getMajor());
        vo.setGrade(student.getGrade());
        vo.setClassName(profile.getClassName());
        vo.setGpa(profile.getGpa());
        vo.setRanking(profile.getRanking());
        vo.setEnglishLevel(profile.getEnglishLevel());
        vo.setProgrammingLanguages(splitToList(profile.getProgrammingLanguages()));
        vo.setTechStack(splitToList(profile.getTechStack()));
        vo.setProjectExperience(profile.getProjectExperience());
        vo.setCompetitionExperience(profile.getCompetitionExperience());
        vo.setResearchExperience(profile.getResearchExperience());
        vo.setInternshipExperience(profile.getInternshipExperience());
        vo.setWeeklyHours(profile.getWeeklyHours());
        vo.setAvailableSlots(profile.getAvailableSlots());
        vo.setOtherDuties(profile.getOtherDuties());
        vo.setExpectedDirection(profile.getExpectedDirection());
        vo.setStatement(profile.getStatement());
        return vo;
    }

    /**
     * 查询负责人所在实训室。
     *
     * @param leaderUserId 负责人用户 ID
     * @return 实训室
     */
    private Lab requireLeaderLab(Long leaderUserId) {
        Lab lab = labMapper.selectOne(new LambdaQueryWrapper<Lab>().eq(Lab::getLeaderId, leaderUserId));
        if (lab == null) {
            throw new BusinessException(ResultCode.FORBIDDEN, "仅实训室负责人可查看本室报名学生");
        }
        return lab;
    }

    /**
     * 按 ID 或最近轮次解析轮次。
     *
     * @param roundId 轮次 ID
     * @return 选拔轮次，可能为空
     */
    private SelectionRound resolveRound(Long roundId) {
        if (roundId != null) {
            return selectionRoundMapper.selectById(roundId);
        }
        return currentRound();
    }

    /**
     * 组装报名学生行。
     *
     * @param student   学生账号
     * @param schedule  面试排期，可为空
     * @param session   面试场次，可为空
     * @param score     评分记录，可为空
     * @param admission 录取记录，可为空
     * @return 报名学生行
     */
    private TeacherApplicantVO buildApplicant(SysUser student, InterviewSchedule schedule,
                                              InterviewSession session, InterviewScore score,
                                              Admission admission) {
        TeacherApplicantVO vo = new TeacherApplicantVO();
        vo.setStudentId(student == null ? null : student.getId());
        vo.setStudentNo(student == null ? "" : DesensitizeUtils.maskUserNo(student.getUserNo()));
        vo.setStudentName(student == null ? "" : DesensitizeUtils.maskName(student.getRealName()));
        vo.setCollege(student == null ? "" : student.getCollege());
        vo.setMajor(student == null ? "" : student.getMajor());
        vo.setGrade(student == null ? "" : student.getGrade());
        vo.setSessionName(session == null ? null : session.getSessionName());
        vo.setInterviewDate(session == null ? null : session.getInterviewDate());
        if (score != null) {
            vo.setTotalScore(Optional.ofNullable(score.getFinalTotal()).orElse(score.getManualTotal()));
            vo.setScoreStatus(score.getStatus());
            vo.setScoreStatusText(StatusTextUtils.interviewScoreStatus(score.getStatus()));
        }
        if (admission != null) {
            vo.setAdmissionStatus(admission.getStatus());
            vo.setAdmissionStatusText(StatusTextUtils.admissionStatus(admission.getStatus()));
        }
        return vo;
    }

    /**
     * 查询当前教师导师档案。
     *
     * @param teacherUserId 教师用户 ID
     * @return 导师档案
     */
    private MentorProfile requireMentor(Long teacherUserId) {
        MentorProfile mentor = mentorProfileMapper.selectOne(new LambdaQueryWrapper<MentorProfile>()
                .eq(MentorProfile::getUserId, teacherUserId));
        if (mentor == null || !Integer.valueOf(MENTOR_ENABLED).equals(mentor.getStatus())) {
            throw new BusinessException(ResultCode.NOT_FOUND, "导师档案不存在");
        }
        return mentor;
    }

    /**
     * 查询最近轮次。
     *
     * @return 轮次，可能为空
     */
    private SelectionRound currentRound() {
        return selectionRoundMapper.selectOne(new LambdaQueryWrapper<SelectionRound>()
                .orderByDesc(SelectionRound::getRoundNo)
                .last("LIMIT 1"));
    }

    /**
     * 判断填报是否已截止。
     *
     * @param round 当前轮次，可为空
     * @return 是否已截止
     */
    private boolean applyFinished(SelectionRound round) {
        return round != null && round.getApplyEnd() != null
                && !LocalDateTime.now().isBefore(round.getApplyEnd());
    }

    /**
     * 加载某导师的面试排期。
     *
     * @param roundId    轮次 ID
     * @param mentorId   导师档案 ID
     * @param studentIds 学生 ID 列表
     * @return 学生 ID 到排期的映射
     */
    private Map<Long, InterviewSchedule> loadMentorSchedules(Long roundId, Long mentorId, List<Long> studentIds) {
        return interviewScheduleMapper.selectList(new LambdaQueryWrapper<InterviewSchedule>()
                        .eq(InterviewSchedule::getRoundId, roundId)
                        .eq(InterviewSchedule::getMentorId, mentorId)
                        .in(InterviewSchedule::getStudentId, studentIds)
                        .orderByDesc(InterviewSchedule::getId))
                .stream()
                .collect(Collectors.toMap(InterviewSchedule::getStudentId, Function.identity(),
                        (first, second) -> first));
    }

    /**
     * 加载面试排期。
     *
     * @param roundId    轮次 ID
     * @param studentIds 学生 ID 列表
     * @return 学生 ID 到排期的映射
     */
    private Map<Long, InterviewSchedule> loadSchedules(Long roundId, List<Long> studentIds) {
        return interviewScheduleMapper.selectList(new LambdaQueryWrapper<InterviewSchedule>()
                        .eq(InterviewSchedule::getRoundId, roundId)
                        .in(InterviewSchedule::getStudentId, studentIds)
                        .orderByDesc(InterviewSchedule::getId))
                .stream()
                .collect(Collectors.toMap(InterviewSchedule::getStudentId, Function.identity(),
                        (first, second) -> first));
    }

    /**
     * 加载面试场次。
     *
     * @param sessionIds 场次 ID 列表
     * @return 场次映射
     */
    private Map<Long, InterviewSession> loadSessions(List<Long> sessionIds) {
        if (sessionIds.isEmpty()) {
            return new HashMap<>();
        }
        return interviewSessionMapper.selectBatchIds(sessionIds).stream()
                .collect(Collectors.toMap(InterviewSession::getId, Function.identity(),
                        (first, second) -> first));
    }

    /**
     * 加载某导师的评分。
     *
     * @param roundId    轮次 ID
     * @param mentorId   导师档案 ID
     * @param studentIds 学生 ID 列表
     * @return 学生 ID 到评分的映射
     */
    private Map<Long, InterviewScore> loadMentorScores(Long roundId, Long mentorId, List<Long> studentIds) {
        return interviewScoreMapper.selectList(new LambdaQueryWrapper<InterviewScore>()
                        .eq(InterviewScore::getRoundId, roundId)
                        .eq(InterviewScore::getMentorId, mentorId)
                        .in(InterviewScore::getStudentId, studentIds)
                        .orderByDesc(InterviewScore::getId))
                .stream()
                .collect(Collectors.toMap(InterviewScore::getStudentId, Function.identity(),
                        (first, second) -> first));
    }

    /**
     * 加载本室评分。
     *
     * @param roundId    轮次 ID
     * @param labId      实训室 ID
     * @param studentIds 学生 ID 列表
     * @return 学生 ID 到评分的映射
     */
    private Map<Long, InterviewScore> loadScores(Long roundId, Long labId, List<Long> studentIds) {
        return interviewScoreMapper.selectList(new LambdaQueryWrapper<InterviewScore>()
                        .eq(InterviewScore::getRoundId, roundId)
                        .eq(InterviewScore::getLabId, labId)
                        .in(InterviewScore::getStudentId, studentIds)
                        .orderByDesc(InterviewScore::getId))
                .stream()
                .collect(Collectors.toMap(InterviewScore::getStudentId, Function.identity(),
                        (first, second) -> first));
    }

    /**
     * 加载录取记录。
     *
     * @param roundId    轮次 ID
     * @param studentIds 学生 ID 列表
     * @return 学生 ID 到录取记录的映射
     */
    private Map<Long, Admission> loadAdmissions(Long roundId, List<Long> studentIds) {
        return admissionMapper.selectList(new LambdaQueryWrapper<Admission>()
                        .eq(Admission::getRoundId, roundId)
                        .in(Admission::getStudentId, studentIds)
                        .orderByDesc(Admission::getId))
                .stream()
                .collect(Collectors.toMap(Admission::getStudentId, Function.identity(),
                        (first, second) -> first));
    }

    /**
     * 批量加载本室录取记录。
     *
     * @param roundId    轮次 ID
     * @param labId      实训室 ID
     * @param studentIds 学生 ID 列表
     * @return 学生 ID 到录取记录的映射
     */
    private Map<Long, Admission> loadLabAdmissions(Long roundId, Long labId, List<Long> studentIds) {
        if (studentIds.isEmpty()) {
            return new HashMap<>();
        }
        return admissionMapper.selectList(new LambdaQueryWrapper<Admission>()
                        .eq(Admission::getRoundId, roundId)
                        .eq(Admission::getLabId, labId)
                        .in(Admission::getStudentId, studentIds)
                        .orderByDesc(Admission::getId))
                .stream()
                .collect(Collectors.toMap(Admission::getStudentId, Function.identity(),
                        (first, second) -> first));
    }

    /**
     * 批量加载导师档案。
     *
     * @param mentorIds 导师档案 ID 列表
     * @return 导师档案映射
     */
    private Map<Long, MentorProfile> loadMentors(List<Long> mentorIds) {
        if (mentorIds.isEmpty()) {
            return new HashMap<>();
        }
        return mentorProfileMapper.selectBatchIds(mentorIds).stream()
                .collect(Collectors.toMap(MentorProfile::getId, Function.identity(), (first, second) -> first));
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
     * 逗号分隔字符串转列表。
     *
     * @param value 逗号分隔字符串
     * @return 列表
     */
    private List<String> splitToList(String value) {
        return StrUtil.isBlank(value) ? List.of() : StrUtil.split(value, ',');
    }
}
