package com.college.labselect.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.college.labselect.common.ResultCode;
import com.college.labselect.common.StatusTextUtils;
import com.college.labselect.dto.resp.AdminDashboardVO;
import com.college.labselect.dto.resp.DashboardIntentionItemVO;
import com.college.labselect.dto.resp.DashboardIntentionSummaryVO;
import com.college.labselect.dto.resp.DashboardRoundVO;
import com.college.labselect.dto.resp.DashboardTodoVO;
import com.college.labselect.dto.resp.LeaderDashboardVO;
import com.college.labselect.dto.resp.StudentDashboardVO;
import com.college.labselect.dto.resp.TeacherDashboardVO;
import com.college.labselect.entity.Admission;
import com.college.labselect.entity.Dispute;
import com.college.labselect.entity.Intention;
import com.college.labselect.entity.IntentionItem;
import com.college.labselect.entity.InterviewSchedule;
import com.college.labselect.entity.InterviewScore;
import com.college.labselect.entity.InterviewSession;
import com.college.labselect.entity.Lab;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.Nomination;
import com.college.labselect.entity.Publicity;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.entity.SysUser;
import com.college.labselect.entity.UserNotice;
import com.college.labselect.entity.Waitlist;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.AdmissionMapper;
import com.college.labselect.mapper.DisputeMapper;
import com.college.labselect.mapper.IntentionItemMapper;
import com.college.labselect.mapper.IntentionMapper;
import com.college.labselect.mapper.InterviewScheduleMapper;
import com.college.labselect.mapper.InterviewScoreMapper;
import com.college.labselect.mapper.InterviewSessionMapper;
import com.college.labselect.mapper.LabMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.NominationMapper;
import com.college.labselect.mapper.PublicityMapper;
import com.college.labselect.mapper.SelectionRoundMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.mapper.UserNoticeMapper;
import com.college.labselect.mapper.WaitlistMapper;
import com.college.labselect.service.IDashboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 工作台聚合服务实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements IDashboardService {

    private static final int INTENTION_DRAFT = 1;
    private static final int SCHEDULE_PENDING = 1;
    private static final int SCORE_DRAFT = 1;
    private static final int NOMINATION_DRAFT = 1;
    private static final int WAITLIST_PENDING = 1;
    private static final int SESSION_PUBLISHED = 2;
    private static final int ADMISSION_PENDING = 1;
    private static final int NOTICE_UNREAD = 0;
    private static final int DISPUTE_PENDING = 1;
    private static final int DISPUTE_HANDLING = 2;
    private static final int PUBLICITY_ONGOING = 1;
    private static final int MENTOR_ENABLED = 1;
    private static final int USER_STUDENT = 1;

    private final SelectionRoundMapper selectionRoundMapper;

    private final IntentionMapper intentionMapper;

    private final IntentionItemMapper intentionItemMapper;

    private final InterviewScheduleMapper interviewScheduleMapper;

    private final AdmissionMapper admissionMapper;

    private final UserNoticeMapper userNoticeMapper;

    private final MentorProfileMapper mentorProfileMapper;

    private final LabMapper labMapper;

    private final SysUserMapper sysUserMapper;

    private final NominationMapper nominationMapper;

    private final WaitlistMapper waitlistMapper;

    private final InterviewScoreMapper interviewScoreMapper;

    private final InterviewSessionMapper interviewSessionMapper;

    private final DisputeMapper disputeMapper;

    private final PublicityMapper publicityMapper;

    @Override
    public StudentDashboardVO getStudentDashboard(Long studentId) {
        StudentDashboardVO vo = new StudentDashboardVO();
        vo.setTodo(new ArrayList<>());
        vo.setUnreadNoticeCount(0);
        SelectionRound round = currentRound();
        if (round == null) {
            return vo;
        }
        vo.setRound(buildRound(round));
        Intention intention = intentionMapper.selectOne(new LambdaQueryWrapper<Intention>()
                .eq(Intention::getRoundId, round.getId())
                .eq(Intention::getStudentId, studentId));
        if (intention == null || Integer.valueOf(INTENTION_DRAFT).equals(intention.getStatus())) {
            vo.getTodo().add(todo("INTENTION", "待填报意向", 1, "/student/intention"));
        }
        long interviewCount = interviewScheduleMapper.selectCount(new LambdaQueryWrapper<InterviewSchedule>()
                .eq(InterviewSchedule::getRoundId, round.getId())
                .eq(InterviewSchedule::getStudentId, studentId)
                .eq(InterviewSchedule::getStatus, SCHEDULE_PENDING));
        if (interviewCount > 0) {
            vo.getTodo().add(todo("INTERVIEW", "待参加面试", (int) interviewCount, "/student/interview"));
        }
        long confirmCount = admissionMapper.selectCount(new LambdaQueryWrapper<Admission>()
                .eq(Admission::getRoundId, round.getId())
                .eq(Admission::getStudentId, studentId)
                .eq(Admission::getStatus, ADMISSION_PENDING));
        if (confirmCount > 0) {
            vo.getTodo().add(todo("CONFIRM", "待确认录取", (int) confirmCount, "/student/confirm-center"));
        }
        vo.setIntentionSummary(buildIntentionSummary(intention));
        vo.setUnreadNoticeCount(userNoticeMapper.selectCount(new LambdaQueryWrapper<UserNotice>()
                .eq(UserNotice::getUserId, studentId)
                .eq(UserNotice::getIsRead, NOTICE_UNREAD)).intValue());
        return vo;
    }

    @Override
    public TeacherDashboardVO getTeacherDashboard(Long teacherUserId) {
        SelectionRound round = currentRound();
        MentorProfile mentor = mentorProfileMapper.selectOne(new LambdaQueryWrapper<MentorProfile>()
                .eq(MentorProfile::getUserId, teacherUserId));
        if (mentor == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "导师档案不存在");
        }
        int quota = Optional.ofNullable(mentor.getQuota()).orElse(0);
        int quotaUsed = Optional.ofNullable(mentor.getQuotaUsed()).orElse(0);
        TeacherDashboardVO vo = new TeacherDashboardVO();
        vo.setRound(round == null ? null : buildRound(round));
        vo.setQuota(quota);
        vo.setQuotaUsed(quotaUsed);
        vo.setRemainQuota(Math.max(0, quota - quotaUsed));
        boolean visible = applyFinished(round);
        vo.setApplicantVisible(visible ? 1 : 0);
        vo.setApplicantCount(visible ? intentionItemMapper.selectCount(
                new LambdaQueryWrapper<IntentionItem>()
                        .eq(IntentionItem::getMentorId, mentor.getId())).intValue() : 0);
        long roundId = round == null ? 0L : round.getId();
        vo.setPendingScoreCount(visible ? interviewScoreMapper.selectCount(
                new LambdaQueryWrapper<InterviewScore>()
                        .eq(InterviewScore::getRoundId, roundId)
                        .eq(InterviewScore::getMentorId, mentor.getId())
                        .eq(InterviewScore::getStatus, SCORE_DRAFT)).intValue() : 0);
        vo.setPendingNomination(visible ? nominationMapper.selectCount(
                new LambdaQueryWrapper<Nomination>()
                        .eq(Nomination::getRoundId, roundId)
                        .eq(Nomination::getMentorId, mentor.getId())
                        .eq(Nomination::getStatus, NOMINATION_DRAFT)).intValue() : 0);
        vo.setPendingWaitlistAdjust(visible ? waitlistMapper.selectCount(
                new LambdaQueryWrapper<Waitlist>()
                        .eq(Waitlist::getRoundId, roundId)
                        .eq(Waitlist::getMentorId, mentor.getId())
                        .eq(Waitlist::getApplyStatus, WAITLIST_PENDING)).intValue() : 0);
        return vo;
    }

    @Override
    public LeaderDashboardVO getLeaderDashboard(Long leaderUserId) {
        SelectionRound round = currentRound();
        Lab lab = labMapper.selectOne(new LambdaQueryWrapper<Lab>()
                .eq(Lab::getLeaderId, leaderUserId));
        if (lab == null) {
            throw new BusinessException(ResultCode.FORBIDDEN, "未绑定实训室");
        }
        List<MentorProfile> mentors = mentorProfileMapper.selectList(new LambdaQueryWrapper<MentorProfile>()
                .eq(MentorProfile::getLabId, lab.getId())
                .eq(MentorProfile::getStatus, MENTOR_ENABLED));
        int totalQuota = mentors.stream()
                .mapToInt(item -> Optional.ofNullable(item.getQuota()).orElse(0)).sum();
        int quotaUsed = mentors.stream()
                .mapToInt(item -> Optional.ofNullable(item.getQuotaUsed()).orElse(0)).sum();
        boolean visible = applyFinished(round);
        long roundId = round == null ? 0L : round.getId();
        int pendingScoreCount = interviewScoreMapper.selectCount(new LambdaQueryWrapper<InterviewScore>()
                .eq(InterviewScore::getRoundId, roundId)
                .eq(InterviewScore::getLabId, lab.getId())
                .eq(InterviewScore::getStatus, SCORE_DRAFT)).intValue();
        LeaderDashboardVO vo = new LeaderDashboardVO();
        vo.setRound(round == null ? null : buildRound(round));
        vo.setMentorCount(mentors.size());
        vo.setTotalQuota(totalQuota);
        vo.setQuotaUsed(quotaUsed);
        vo.setRemainQuota(Math.max(0, totalQuota - quotaUsed));
        vo.setApplicantCount(visible ? intentionItemMapper.selectCount(
                new LambdaQueryWrapper<IntentionItem>()
                        .eq(IntentionItem::getLabId, lab.getId())).intValue() : 0);
        vo.setPendingScoreCount(pendingScoreCount);
        vo.setTodo(buildLeaderTodo(round, lab.getId(), pendingScoreCount));
        return vo;
    }

    @Override
    public AdminDashboardVO getAdminDashboard() {
        SelectionRound round = currentRound();
        List<Lab> labs = labMapper.selectList(new LambdaQueryWrapper<Lab>());
        List<MentorProfile> mentors = mentorProfileMapper.selectList(new LambdaQueryWrapper<MentorProfile>());
        int totalQuota = labs.stream()
                .mapToInt(item -> Optional.ofNullable(item.getTotalQuota()).orElse(0)).sum();
        int quotaUsed = mentors.stream()
                .mapToInt(item -> Optional.ofNullable(item.getQuotaUsed()).orElse(0)).sum();
        AdminDashboardVO vo = new AdminDashboardVO();
        vo.setRound(round == null ? null : buildRound(round));
        vo.setLabCount(labs.size());
        vo.setMentorCount(mentors.size());
        vo.setStudentCount(sysUserMapper.selectCount(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getUserType, USER_STUDENT)).intValue());
        vo.setTotalQuota(totalQuota);
        vo.setQuotaUsed(quotaUsed);
        vo.setRemainQuota(Math.max(0, totalQuota - quotaUsed));
        vo.setTodo(buildAdminTodo());
        return vo;
    }

    /**
     * 组装学生填报摘要。
     *
     * @param intention 意向主表，可为空
     * @return 填报摘要，未填报时为 null
     */
    private DashboardIntentionSummaryVO buildIntentionSummary(Intention intention) {
        if (intention == null) {
            return null;
        }
        List<IntentionItem> items = intentionItemMapper.selectList(new LambdaQueryWrapper<IntentionItem>()
                .eq(IntentionItem::getIntentionId, intention.getId()));
        Map<Long, MentorProfile> mentorMap = loadMentors(items.stream()
                .map(IntentionItem::getMentorId).distinct().toList());
        Map<Long, SysUser> userMap = loadUsers(mentorMap.values().stream()
                .map(MentorProfile::getUserId).distinct().toList());
        Map<Long, Lab> labMap = loadLabs(items.stream()
                .map(IntentionItem::getLabId).distinct().toList());
        List<DashboardIntentionItemVO> itemList = new ArrayList<>();
        for (IntentionItem item : items) {
            DashboardIntentionItemVO itemVO = new DashboardIntentionItemVO();
            itemVO.setMentorId(item.getMentorId());
            MentorProfile mentor = mentorMap.get(item.getMentorId());
            SysUser mentorUser = mentor == null ? null : userMap.get(mentor.getUserId());
            itemVO.setMentorName(mentorUser == null ? "" : mentorUser.getRealName());
            Lab lab = labMap.get(item.getLabId());
            itemVO.setLabName(lab == null ? "" : lab.getLabName());
            itemList.add(itemVO);
        }
        DashboardIntentionSummaryVO summary = new DashboardIntentionSummaryVO();
        summary.setStatus(intention.getStatus());
        summary.setItems(itemList);
        summary.setAcceptInnerAdjust(intention.getAcceptInnerAdjust());
        summary.setAcceptCrossAdjust(intention.getAcceptCrossAdjust());
        return summary;
    }

    /**
     * 组装负责人待办。
     *
     * @param round            当前轮次，可为空
     * @param labId            实训室 ID
     * @param pendingScoreCount 待录分人数
     * @return 待办列表
     */
    private List<DashboardTodoVO> buildLeaderTodo(SelectionRound round, Long labId, int pendingScoreCount) {
        List<DashboardTodoVO> todo = new ArrayList<>();
        if (round != null && Integer.valueOf(3).equals(round.getStatus())) {
            long published = interviewSessionMapper.selectCount(new LambdaQueryWrapper<InterviewSession>()
                    .eq(InterviewSession::getRoundId, round.getId())
                    .eq(InterviewSession::getLabId, labId)
                    .eq(InterviewSession::getStatus, SESSION_PUBLISHED));
            if (published == 0) {
                todo.add(todo("SCHEDULE", "待发布面试排期", null, null));
            }
        }
        if (pendingScoreCount > 0) {
            todo.add(todo("SCORE", "待录分 " + pendingScoreCount + " 人", pendingScoreCount, null));
        }
        if (round != null && round.getNominationStart() != null && round.getNominationSubmitEnd() != null) {
            LocalDateTime now = LocalDateTime.now();
            if (!now.isBefore(round.getNominationStart()) && !now.isAfter(round.getNominationSubmitEnd())) {
                long draftCount = nominationMapper.selectCount(new LambdaQueryWrapper<Nomination>()
                        .eq(Nomination::getRoundId, round.getId())
                        .eq(Nomination::getLabId, labId)
                        .eq(Nomination::getStatus, NOMINATION_DRAFT));
                if (draftCount > 0) {
                    todo.add(todo("NOMINATION", "待汇总本室名单", (int) draftCount, "/leader/nominations"));
                }
            }
        }
        return todo;
    }

    /**
     * 组装管理员待办。
     *
     * @return 待办列表
     */
    private List<DashboardTodoVO> buildAdminTodo() {
        List<DashboardTodoVO> todo = new ArrayList<>();
        long disputes = disputeMapper.selectCount(new LambdaQueryWrapper<Dispute>()
                .in(Dispute::getStatus, DISPUTE_PENDING, DISPUTE_HANDLING));
        if (disputes > 0) {
            todo.add(todo("DISPUTE", "待处理异议 " + disputes + " 件", (int) disputes, "/admin/disputes"));
        }
        long publicities = publicityMapper.selectCount(new LambdaQueryWrapper<Publicity>()
                .eq(Publicity::getStatus, PUBLICITY_ONGOING));
        if (publicities > 0) {
            todo.add(todo("PUBLICITY", "公示进行中 " + publicities + " 批",
                    (int) publicities, "/admin/publicities"));
        }
        return todo;
    }

    /**
     * 构建待办项。
     *
     * @param type   类型
     * @param text   文案
     * @param count  数量
     * @param target 跳转地址
     * @return 待办项
     */
    private DashboardTodoVO todo(String type, String text, Integer count, String target) {
        DashboardTodoVO todo = new DashboardTodoVO();
        todo.setType(type);
        todo.setText(text);
        todo.setCount(count);
        todo.setTarget(target);
        return todo;
    }

    /**
     * 构建轮次摘要与倒计时。
     *
     * @param round 当前轮次
     * @return 轮次摘要
     */
    private DashboardRoundVO buildRound(SelectionRound round) {
        DashboardRoundVO vo = new DashboardRoundVO();
        vo.setRoundNo(round.getRoundNo());
        vo.setRoundName(round.getRoundName());
        vo.setStatus(round.getStatus());
        vo.setStatusText(StatusTextUtils.roundStatus(round.getStatus()));
        vo.setCountdownSeconds(countdownSeconds(round));
        return vo;
    }

    /**
     * 计算距离下一个时间窗节点的秒数。
     *
     * @param round 当前轮次
     * @return 秒数，无后续节点时为 null
     */
    private Long countdownSeconds(SelectionRound round) {
        LocalDateTime now = LocalDateTime.now();
        List<LocalDateTime> points = new ArrayList<>();
        points.add(round.getApplyStart());
        points.add(round.getApplyEnd());
        points.add(round.getInterviewStart());
        points.add(round.getInterviewEnd());
        points.add(round.getNominationStart());
        points.add(round.getNominationSubmitEnd());
        points.add(round.getConfirmStart());
        points.add(round.getNominationEnd());
        points.add(round.getAdjustStart());
        points.add(round.getAdjustEnd());
        for (LocalDateTime point : points) {
            if (point != null && point.isAfter(now)) {
                return Duration.between(now, point).getSeconds();
            }
        }
        return null;
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
     * 查询当前轮次，取轮次序号最大者。
     *
     * @return 当前轮次，可能为空
     */
    private SelectionRound currentRound() {
        return selectionRoundMapper.selectOne(new LambdaQueryWrapper<SelectionRound>()
                .orderByDesc(SelectionRound::getRoundNo)
                .last("LIMIT 1"));
    }

    /**
     * 批量加载导师档案。
     *
     * @param mentorIds 导师档案 ID 列表
     * @return 导师映射
     */
    private Map<Long, MentorProfile> loadMentors(List<Long> mentorIds) {
        if (mentorIds.isEmpty()) {
            return new HashMap<>();
        }
        return mentorProfileMapper.selectBatchIds(mentorIds).stream()
                .collect(Collectors.toMap(MentorProfile::getId, Function.identity(),
                        (first, second) -> first));
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
}
