package com.college.labselect.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.college.labselect.common.InterviewTimeUtils;
import com.college.labselect.common.ResultCode;
import com.college.labselect.common.StatusTextUtils;
import com.college.labselect.dto.req.InterviewSessionSaveReqDTO;
import com.college.labselect.dto.resp.InterviewSessionVO;
import com.college.labselect.dto.resp.PublishScheduleRespVO;
import com.college.labselect.entity.Intention;
import com.college.labselect.entity.IntentionItem;
import com.college.labselect.entity.InterviewSchedule;
import com.college.labselect.entity.InterviewSession;
import com.college.labselect.entity.InterviewSessionInterviewer;
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
import com.college.labselect.service.IInterviewSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
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
 * 面试场次服务实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InterviewSessionServiceImpl implements IInterviewSessionService {

    private static final int SESSION_DRAFT = 1;
    private static final int SESSION_PUBLISHED = 2;
    private static final int LOCKED = 1;
    private static final int ROUND_INTERVIEWING = 3;
    private static final int INTENTION_SUBMITTED = 2;
    private static final int USER_ENABLED = 1;
    private static final int NOTICE_TYPE_INTERVIEW = 3;

    private final InterviewSessionMapper interviewSessionMapper;
    private final InterviewScheduleMapper interviewScheduleMapper;
    private final InterviewSessionInterviewerMapper interviewerMapper;
    private final IntentionMapper intentionMapper;
    private final IntentionItemMapper intentionItemMapper;
    private final LabMapper labMapper;
    private final MentorProfileMapper mentorProfileMapper;
    private final SelectionRoundMapper selectionRoundMapper;
    private final SysUserMapper sysUserMapper;
    private final UserNoticeMapper userNoticeMapper;
    private final OperationLogMapper operationLogMapper;

    @Override
    public List<InterviewSessionVO> listSessions(Long leaderUserId, Long roundId) {
        Lab lab = requireLab(leaderUserId);
        SelectionRound round = resolveRound(roundId);
        if (round == null) {
            return List.of();
        }
        List<InterviewSession> sessions = interviewSessionMapper.selectList(new LambdaQueryWrapper<InterviewSession>()
                .eq(InterviewSession::getRoundId, round.getId())
                .eq(InterviewSession::getLabId, lab.getId())
                .orderByAsc(InterviewSession::getInterviewDate)
                .orderByAsc(InterviewSession::getStartTime));
        if (sessions.isEmpty()) {
            return List.of();
        }
        List<Long> sessionIds = sessions.stream().map(InterviewSession::getId).toList();
        Map<Long, List<Long>> interviewerIds = loadInterviewerIds(sessionIds);
        Map<Long, SysUser> userMap = loadUsers(interviewerIds.values().stream()
                .flatMap(List::stream).distinct().toList());
        Map<Long, Long> scheduledCountMap = interviewScheduleMapper.selectList(
                        new LambdaQueryWrapper<InterviewSchedule>()
                                .eq(InterviewSchedule::getRoundId, round.getId())
                                .eq(InterviewSchedule::getLabId, lab.getId()))
                .stream()
                .collect(Collectors.groupingBy(InterviewSchedule::getSessionId, Collectors.counting()));
        List<InterviewSessionVO> result = new ArrayList<>();
        for (InterviewSession session : sessions) {
            List<Long> ids = interviewerIds.getOrDefault(session.getId(), List.of());
            InterviewSessionVO vo = new InterviewSessionVO();
            vo.setId(session.getId());
            vo.setRoundId(session.getRoundId());
            vo.setSessionName(session.getSessionName());
            vo.setInterviewDate(session.getInterviewDate());
            vo.setStartTime(session.getStartTime());
            vo.setEndTime(session.getEndTime());
            vo.setLocation(session.getLocation());
            vo.setCapacity(session.getCapacity());
            vo.setScheduledCount(scheduledCountMap.getOrDefault(session.getId(), 0L).intValue());
            vo.setStatus(session.getStatus());
            vo.setStatusText(StatusTextUtils.interviewSessionStatus(session.getStatus()));
            vo.setInterviewerIds(ids);
            vo.setInterviewerNames(ids.stream()
                    .map(userMap::get)
                    .filter(Objects::nonNull)
                    .map(SysUser::getRealName)
                    .toList());
            result.add(vo);
        }
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long createSession(Long leaderUserId, InterviewSessionSaveReqDTO req) {
        Lab lab = requireLab(leaderUserId);
        SelectionRound round = selectionRoundMapper.selectById(req.getRoundId());
        if (round == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "选拔轮次不存在");
        }
        validateSessionReq(lab, round, req);
        List<Long> interviewerIds = validateInterviewers(lab, req.getInterviewerIds());
        InterviewSession session = new InterviewSession();
        fillSession(session, lab, req);
        session.setStatus(SESSION_DRAFT);
        interviewSessionMapper.insert(session);
        saveInterviewers(session.getId(), interviewerIds);
        log.info("新增面试场次，labId={}，roundId={}，sessionId={}", lab.getId(), round.getId(), session.getId());
        return session.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateSession(Long leaderUserId, Long id, InterviewSessionSaveReqDTO req) {
        InterviewSession session = interviewSessionMapper.selectById(id);
        if (session == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "面试场次不存在");
        }
        if (!Integer.valueOf(SESSION_DRAFT).equals(session.getStatus())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "已发布场次不可修改");
        }
        Lab lab = requireLab(leaderUserId);
        if (!Objects.equals(session.getLabId(), lab.getId())) {
            throw new BusinessException(ResultCode.FORBIDDEN, "无权操作其他实训室的面试场次");
        }
        SelectionRound round = selectionRoundMapper.selectById(req.getRoundId());
        if (round == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "选拔轮次不存在");
        }
        validateSessionReq(lab, round, req);
        List<Long> interviewerIds = validateInterviewers(lab, req.getInterviewerIds());
        fillSession(session, lab, req);
        interviewSessionMapper.updateById(session);
        interviewerMapper.delete(new LambdaQueryWrapper<InterviewSessionInterviewer>()
                .eq(InterviewSessionInterviewer::getSessionId, id));
        saveInterviewers(id, interviewerIds);
        log.info("修改面试场次，sessionId={}", id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteSession(Long leaderUserId, Long id) {
        InterviewSession session = interviewSessionMapper.selectById(id);
        if (session == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "面试场次不存在");
        }
        if (!Integer.valueOf(SESSION_DRAFT).equals(session.getStatus())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "已发布场次不可删除");
        }
        Lab lab = requireLab(leaderUserId);
        if (!Objects.equals(session.getLabId(), lab.getId())) {
            throw new BusinessException(ResultCode.FORBIDDEN, "无权操作其他实训室的面试场次");
        }
        long scheduled = interviewScheduleMapper.selectCount(new LambdaQueryWrapper<InterviewSchedule>()
                .eq(InterviewSchedule::getSessionId, id));
        if (scheduled > 0) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "场次已有排期，不可删除");
        }
        interviewerMapper.delete(new LambdaQueryWrapper<InterviewSessionInterviewer>()
                .eq(InterviewSessionInterviewer::getSessionId, id));
        interviewSessionMapper.deleteById(id);
        log.info("删除面试场次，sessionId={}", id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PublishScheduleRespVO publish(Long leaderUserId, Long roundId) {
        Lab lab = requireLab(leaderUserId);
        List<InterviewSession> sessions = interviewSessionMapper.selectList(
                new LambdaQueryWrapper<InterviewSession>()
                        .eq(InterviewSession::getRoundId, roundId)
                        .eq(InterviewSession::getLabId, lab.getId())
                        .in(InterviewSession::getStatus, SESSION_DRAFT, SESSION_PUBLISHED));
        List<InterviewSchedule> schedules = interviewScheduleMapper.selectList(
                new LambdaQueryWrapper<InterviewSchedule>()
                        .eq(InterviewSchedule::getRoundId, roundId)
                        .eq(InterviewSchedule::getLabId, lab.getId()));
        Map<Long, InterviewSession> sessionMap = sessions.stream()
                .collect(Collectors.toMap(InterviewSession::getId, Function.identity(), (first, second) -> first));
        checkInterviewerConflict(sessions);
        Map<Long, List<InterviewSchedule>> byStudent = schedules.stream()
                .filter(schedule -> sessionMap.containsKey(schedule.getSessionId()))
                .collect(Collectors.groupingBy(InterviewSchedule::getStudentId));
        checkStudentConflict(byStudent, sessionMap);
        checkCapacity(byStudent, sessionMap);
        checkCoverage(roundId, lab.getId(), schedules);
        for (InterviewSession session : sessions) {
            if (Integer.valueOf(SESSION_DRAFT).equals(session.getStatus())) {
                InterviewSession update = new InterviewSession();
                update.setId(session.getId());
                update.setStatus(SESSION_PUBLISHED);
                interviewSessionMapper.updateById(update);
            }
        }
        int noticeCount = sendNotices(schedules, sessionMap);
        log.info("发布面试排期，labId={}，roundId={}，sessionCount={}，studentCount={}",
                lab.getId(), roundId, sessions.size(), byStudent.size());
        return new PublishScheduleRespVO(sessions.size(), byStudent.size(), noticeCount);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PublishScheduleRespVO cancelPublish(Long leaderUserId, Long roundId, String reason) {
        Lab lab = requireLab(leaderUserId);
        SelectionRound round = selectionRoundMapper.selectById(roundId);
        if (round == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "选拔轮次不存在");
        }
        if (Integer.valueOf(LOCKED).equals(round.getLocked())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "批次已锁定，不可取消排期");
        }
        if (!Integer.valueOf(ROUND_INTERVIEWING).equals(round.getStatus())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "当前不在面试阶段");
        }
        List<InterviewSession> sessions = interviewSessionMapper.selectList(
                new LambdaQueryWrapper<InterviewSession>()
                        .eq(InterviewSession::getRoundId, roundId)
                        .eq(InterviewSession::getLabId, lab.getId())
                        .eq(InterviewSession::getStatus, SESSION_PUBLISHED));
        if (sessions.isEmpty()) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "无可取消的已发布场次");
        }
        List<InterviewSchedule> schedules = interviewScheduleMapper.selectList(
                new LambdaQueryWrapper<InterviewSchedule>()
                        .eq(InterviewSchedule::getRoundId, roundId)
                        .eq(InterviewSchedule::getLabId, lab.getId()));
        Map<Long, InterviewSession> sessionMap = sessions.stream()
                .collect(Collectors.toMap(InterviewSession::getId, Function.identity(), (first, second) -> first));
        for (InterviewSession session : sessions) {
            InterviewSession update = new InterviewSession();
            update.setId(session.getId());
            update.setStatus(SESSION_DRAFT);
            interviewSessionMapper.updateById(update);
        }
        int noticeCount = sendCancelNotices(schedules, sessionMap);
        writeCancelLog(leaderUserId, roundId, reason);
        long studentCount = schedules.stream()
                .filter(schedule -> sessionMap.containsKey(schedule.getSessionId()))
                .map(InterviewSchedule::getStudentId)
                .distinct()
                .count();
        log.info("取消面试排期，labId={}，roundId={}，sessionCount={}，studentCount={}",
                lab.getId(), roundId, sessions.size(), studentCount);
        return new PublishScheduleRespVO(sessions.size(), (int) studentCount, noticeCount);
    }

    /**
     * 写入取消并重排操作日志。
     *
     * @param operatorId 操作人用户 ID
     * @param roundId    轮次 ID
     * @param reason     取消原因
     */
    private void writeCancelLog(Long operatorId, Long roundId, String reason) {
        SysUser operator = sysUserMapper.selectById(operatorId);
        OperationLog operationLog = new OperationLog();
        operationLog.setOperatorId(operatorId);
        operationLog.setOperatorName(operator == null ? "" : operator.getRealName());
        operationLog.setBizType("INTERVIEW_SESSION");
        operationLog.setBizId(roundId);
        operationLog.setAction("取消并重排");
        operationLog.setBeforeValue("status=2");
        operationLog.setAfterValue("status=1");
        operationLog.setReason(reason);
        operationLogMapper.insert(operationLog);
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
            throw new BusinessException(ResultCode.FORBIDDEN, "仅实训室负责人可操作面试场次");
        }
        return lab;
    }

    /**
     * 按 ID 或最近轮次解析轮次。
     *
     * @param roundId 轮次 ID，可为空
     * @return 选拔轮次，可能为空
     */
    private SelectionRound resolveRound(Long roundId) {
        if (roundId != null) {
            return selectionRoundMapper.selectById(roundId);
        }
        return selectionRoundMapper.selectOne(new LambdaQueryWrapper<SelectionRound>()
                .orderByDesc(SelectionRound::getRoundNo)
                .last("LIMIT 1"));
    }

    /**
     * 校验场次时间、容量与轮次状态。
     *
     * @param lab   实训室
     * @param round 选拔轮次
     * @param req   场次请求
     */
    private void validateSessionReq(Lab lab, SelectionRound round, InterviewSessionSaveReqDTO req) {
        if (!Integer.valueOf(ROUND_INTERVIEWING).equals(round.getStatus())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "当前不在面试阶段");
        }
        if (req.getStartTime() == null || req.getEndTime() == null
                || !req.getStartTime().isBefore(req.getEndTime())) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "结束时间必须晚于开始时间");
        }
        LocalDate interviewDate = req.getInterviewDate();
        if (interviewDate == null) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "面试日期不能为空");
        }
        if (round.getInterviewStart() != null && interviewDate.isBefore(round.getInterviewStart().toLocalDate())) {
            throw new BusinessException(ResultCode.OUT_OF_TIME_WINDOW, "面试日期不在轮次面试时间窗内");
        }
        if (round.getInterviewEnd() != null && interviewDate.isAfter(round.getInterviewEnd().toLocalDate())) {
            throw new BusinessException(ResultCode.OUT_OF_TIME_WINDOW, "面试日期不在轮次面试时间窗内");
        }
    }

    /**
     * 校验面试官均为本室在职导师。
     *
     * @param lab            实训室
     * @param interviewerIds 面试官用户 ID 列表
     * @return 去重后的面试官 ID
     */
    private List<Long> validateInterviewers(Lab lab, List<Long> interviewerIds) {
        List<Long> ids = Optional.ofNullable(interviewerIds).orElse(List.of()).stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (ids.isEmpty()) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "面试官至少配置 1 人");
        }
        Set<Long> mentorUserIds = mentorProfileMapper.selectList(new LambdaQueryWrapper<MentorProfile>()
                        .eq(MentorProfile::getLabId, lab.getId()))
                .stream()
                .map(MentorProfile::getUserId)
                .collect(Collectors.toSet());
        Map<Long, SysUser> userMap = loadUsers(ids);
        for (Long id : ids) {
            SysUser user = userMap.get(id);
            if (!mentorUserIds.contains(id) || user == null
                    || !Integer.valueOf(USER_ENABLED).equals(user.getStatus())) {
                throw new BusinessException(ResultCode.BUSINESS_ERROR, "面试官须为本实训室在职导师");
            }
        }
        return ids;
    }

    /**
     * 填充场次字段。
     *
     * @param session 场次实体
     * @param lab     实训室
     * @param req     场次请求
     */
    private void fillSession(InterviewSession session, Lab lab, InterviewSessionSaveReqDTO req) {
        session.setRoundId(req.getRoundId());
        session.setLabId(lab.getId());
        session.setSessionName(StrUtil.trim(req.getSessionName()));
        session.setInterviewDate(req.getInterviewDate());
        session.setStartTime(req.getStartTime());
        session.setEndTime(req.getEndTime());
        session.setLocation(StrUtil.trim(req.getLocation()));
        session.setCapacity(req.getCapacity());
    }

    /**
     * 保存场次面试官关联。
     *
     * @param sessionId      场次 ID
     * @param interviewerIds 面试官用户 ID 列表
     */
    private void saveInterviewers(Long sessionId, List<Long> interviewerIds) {
        for (Long interviewerId : interviewerIds) {
            InterviewSessionInterviewer interviewer = new InterviewSessionInterviewer();
            interviewer.setSessionId(sessionId);
            interviewer.setInterviewerId(interviewerId);
            interviewerMapper.insert(interviewer);
        }
    }

    /**
     * 校验面试官时段冲突。
     *
     * @param sessions 场次列表
     */
    private void checkInterviewerConflict(List<InterviewSession> sessions) {
        if (sessions.isEmpty()) {
            return;
        }
        List<Long> sessionIds = sessions.stream().map(InterviewSession::getId).toList();
        Map<Long, InterviewSession> sessionMap = sessions.stream()
                .collect(Collectors.toMap(InterviewSession::getId, Function.identity(), (first, second) -> first));
        Map<Long, List<Long>> interviewerSessions = new HashMap<>();
        for (InterviewSessionInterviewer interviewer : interviewerMapper.selectList(
                new LambdaQueryWrapper<InterviewSessionInterviewer>()
                        .in(InterviewSessionInterviewer::getSessionId, sessionIds))) {
            interviewerSessions.computeIfAbsent(interviewer.getInterviewerId(), key -> new ArrayList<>())
                    .add(interviewer.getSessionId());
        }
        for (List<Long> ids : interviewerSessions.values()) {
            for (int i = 0; i < ids.size(); i++) {
                for (int j = i + 1; j < ids.size(); j++) {
                    InterviewSession first = sessionMap.get(ids.get(i));
                    InterviewSession second = sessionMap.get(ids.get(j));
                    if (first != null && second != null && InterviewTimeUtils.overlap(first, second)) {
                        throw new BusinessException(ResultCode.DUPLICATE_SUBMIT, "存在面试官时间冲突");
                    }
                }
            }
        }
    }

    /**
     * 校验学生时段冲突。
     *
     * @param byStudent  学生排期分组
     * @param sessionMap 场次映射
     */
    private void checkStudentConflict(Map<Long, List<InterviewSchedule>> byStudent,
                                      Map<Long, InterviewSession> sessionMap) {
        for (List<InterviewSchedule> studentSchedules : byStudent.values()) {
            for (int i = 0; i < studentSchedules.size(); i++) {
                for (int j = i + 1; j < studentSchedules.size(); j++) {
                    InterviewSession first = sessionMap.get(studentSchedules.get(i).getSessionId());
                    InterviewSession second = sessionMap.get(studentSchedules.get(j).getSessionId());
                    if (first != null && second != null && InterviewTimeUtils.overlap(first, second)) {
                        throw new BusinessException(ResultCode.DUPLICATE_SUBMIT,
                                "存在学生时间冲突：" + first.getSessionName() + " 与 " + second.getSessionName());
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
                throw new BusinessException(ResultCode.BUSINESS_ERROR, "场次超出容量：" + session.getSessionName());
            }
        }
    }

    /**
     * 校验本室已提交意向学生全部完成排期。
     *
     * @param roundId   轮次 ID
     * @param labId     实训室 ID
     * @param schedules 排期列表
     */
    private void checkCoverage(Long roundId, Long labId, List<InterviewSchedule> schedules) {
        List<Intention> intentions = intentionMapper.selectList(new LambdaQueryWrapper<Intention>()
                .eq(Intention::getRoundId, roundId)
                .eq(Intention::getStatus, INTENTION_SUBMITTED));
        if (intentions.isEmpty()) {
            return;
        }
        Map<Long, Long> intentionStudentMap = intentions.stream()
                .collect(Collectors.toMap(Intention::getId, Intention::getStudentId,
                        (first, second) -> first));
        List<IntentionItem> items = intentionItemMapper.selectList(new LambdaQueryWrapper<IntentionItem>()
                .in(IntentionItem::getIntentionId, intentionStudentMap.keySet())
                .eq(IntentionItem::getLabId, labId));
        Set<Long> expectedStudents = items.stream()
                .map(item -> intentionStudentMap.get(item.getIntentionId()))
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Set<Long> scheduledStudents = schedules.stream()
                .map(InterviewSchedule::getStudentId)
                .collect(Collectors.toSet());
        long missing = expectedStudents.stream()
                .filter(studentId -> !scheduledStudents.contains(studentId))
                .count();
        if (missing > 0) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "存在 " + missing + " 名学生未排期");
        }
    }

    /**
     * 向学生推送面试安排通知。
     *
     * @param schedules  排期列表
     * @param sessionMap 场次映射
     * @return 推送数量
     */
    private int sendNotices(List<InterviewSchedule> schedules, Map<Long, InterviewSession> sessionMap) {
        int count = 0;
        Set<Long> sent = new HashSet<>();
        for (InterviewSchedule schedule : schedules) {
            InterviewSession session = sessionMap.get(schedule.getSessionId());
            if (session == null || !sent.add(schedule.getId())) {
                continue;
            }
            String content = "你的面试安排：" + session.getSessionName() + "，"
                    + session.getInterviewDate() + " " + session.getStartTime() + "-" + session.getEndTime()
                    + "，地点 " + session.getLocation() + "。请提前 10 分钟到场。";
            if (saveNotice(schedule.getStudentId(), schedule.getId(), "面试安排", content)) {
                count++;
            }
        }
        return count;
    }

    /**
     * 向学生推送面试取消通知，复用同一通知位以便重新发布时覆盖更新。
     *
     * @param schedules  排期列表
     * @param sessionMap 场次映射
     * @return 推送数量
     */
    private int sendCancelNotices(List<InterviewSchedule> schedules, Map<Long, InterviewSession> sessionMap) {
        int count = 0;
        Set<Long> sent = new HashSet<>();
        for (InterviewSchedule schedule : schedules) {
            InterviewSession session = sessionMap.get(schedule.getSessionId());
            if (session == null || !sent.add(schedule.getId())) {
                continue;
            }
            String content = "【已变更】原面试安排：" + session.getSessionName() + "，"
                    + session.getInterviewDate() + " " + session.getStartTime() + "-" + session.getEndTime()
                    + "，地点 " + session.getLocation() + "。该安排已取消，实训室将重新排期，请等待最新通知。";
            if (saveNotice(schedule.getStudentId(), schedule.getId(), "面试安排变更", content)) {
                count++;
            }
        }
        return count;
    }

    /**
     * 写入或更新面试通知，重复发布时复用同一业务通知位。
     *
     * @param userId  学生用户 ID
     * @param bizId   排期 ID
     * @param title   通知标题
     * @param content 通知内容
     * @return 是否写入成功
     */
    private boolean saveNotice(Long userId, Long bizId, String title, String content) {
        UserNotice existing = userNoticeMapper.selectOne(new LambdaQueryWrapper<UserNotice>()
                .eq(UserNotice::getBizType, "INTERVIEW")
                .eq(UserNotice::getBizId, bizId)
                .eq(UserNotice::getUserId, userId)
                .eq(UserNotice::getNoticeType, NOTICE_TYPE_INTERVIEW));
        if (existing != null) {
            existing.setTitle(title);
            existing.setContent(content);
            existing.setIsRead(0);
            userNoticeMapper.updateById(existing);
            return true;
        }
        UserNotice notice = new UserNotice();
        notice.setUserId(userId);
        notice.setTitle(title);
        notice.setContent(content);
        notice.setNoticeType(NOTICE_TYPE_INTERVIEW);
        notice.setBizType("INTERVIEW");
        notice.setBizId(bizId);
        notice.setIsRead(0);
        try {
            userNoticeMapper.insert(notice);
            return true;
        } catch (DuplicateKeyException exception) {
            log.info("面试通知已存在，忽略重复推送，scheduleId={}", bizId);
            return false;
        }
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
}
