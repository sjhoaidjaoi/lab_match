package com.college.labselect.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import cn.hutool.core.util.StrUtil;
import com.college.labselect.common.DesensitizeUtils;
import com.college.labselect.common.PageResult;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.AdminReallocationItemReqDTO;
import com.college.labselect.dto.req.AdminReallocationReqDTO;
import com.college.labselect.dto.req.AdmissionAdjustReqDTO;
import com.college.labselect.dto.req.LeaderReallocationReqDTO;
import com.college.labselect.dto.resp.AdminReallocationRespVO;
import com.college.labselect.dto.resp.AdmissionAdjustRespVO;
import com.college.labselect.dto.resp.LeaderReallocationRespVO;
import com.college.labselect.dto.resp.ReallocationCandidateVO;
import com.college.labselect.dto.resp.ReallocationFailVO;
import com.college.labselect.dto.resp.ReallocationMentorVO;
import com.college.labselect.entity.Admission;
import com.college.labselect.entity.Intention;
import com.college.labselect.entity.IntentionItem;
import com.college.labselect.entity.InterviewScore;
import com.college.labselect.entity.Lab;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.OperationLog;
import com.college.labselect.entity.Reallocation;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.entity.SysUser;
import com.college.labselect.entity.UserNotice;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.AdmissionMapper;
import com.college.labselect.mapper.IntentionItemMapper;
import com.college.labselect.mapper.IntentionMapper;
import com.college.labselect.mapper.InterviewScoreMapper;
import com.college.labselect.mapper.LabMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.OperationLogMapper;
import com.college.labselect.mapper.ReallocationMapper;
import com.college.labselect.mapper.SelectionRoundMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.mapper.UserNoticeMapper;
import com.college.labselect.service.IReallocationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
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
 * 三级统筹调剂与阶段内调整服务实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReallocationServiceImpl implements IReallocationService {

    private static final int LEVEL_INNER = 1;
    private static final int LEVEL_CROSS = 2;
    private static final int LEVEL_TALK = 3;
    private static final int STATUS_PENDING = 1;
    private static final int STATUS_CONFIRMED = 2;
    private static final int STATUS_ENROLLED = 3;
    private static final int STATUS_ABANDONED = 4;
    private static final int ACTIVE = 1;
    private static final int LOCKED = 1;
    private static final int MENTOR_ENABLED = 1;
    private static final int NOTICE_TYPE_CONFIRM = 4;
    private static final String ACTION_CONFIRM = "CONFIRM";
    private static final String ACTION_CANCEL = "CANCEL";
    private static final String ACTION_REASSIGN = "REASSIGN";
    private static final String ACTION_ABANDON = "ABANDON";

    private final ReallocationMapper reallocationMapper;
    private final AdmissionMapper admissionMapper;
    private final MentorProfileMapper mentorProfileMapper;
    private final IntentionMapper intentionMapper;
    private final IntentionItemMapper intentionItemMapper;
    private final SelectionRoundMapper selectionRoundMapper;
    private final LabMapper labMapper;
    private final SysUserMapper sysUserMapper;
    private final OperationLogMapper operationLogMapper;
    private final InterviewScoreMapper interviewScoreMapper;
    private final UserNoticeMapper userNoticeMapper;
    private final AdmissionWaitlistSupport waitlistSupport;

    @Override
    public PageResult<ReallocationCandidateVO> listLeaderCandidates(Long leaderUserId, Long roundId,
                                                                    long pageNum, long pageSize) {
        MentorProfile leader = mentorProfileMapper.selectOne(new LambdaQueryWrapper<MentorProfile>()
                .eq(MentorProfile::getUserId, leaderUserId));
        if (leader == null) {
            throw new BusinessException(ResultCode.FORBIDDEN, "仅实训室负责人可查看本室调剂候选");
        }
        Long targetRoundId = resolveRoundId(roundId);
        List<ReallocationCandidateVO> candidates = buildCandidates(targetRoundId, LEVEL_INNER, leader.getLabId());
        return paginate(candidates, pageNum, pageSize);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public LeaderReallocationRespVO reallocateInner(Long leaderUserId, LeaderReallocationReqDTO req) {
        if (StrUtil.isBlank(req.getReason())) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "调剂说明不能为空");
        }
        SelectionRound round = requireAdjustableRound(req.getRoundId());
        MentorProfile leader = mentorProfileMapper.selectOne(new LambdaQueryWrapper<MentorProfile>()
                .eq(MentorProfile::getUserId, leaderUserId));
        if (leader == null) {
            throw new BusinessException(ResultCode.FORBIDDEN, "仅实训室负责人可执行本室调剂");
        }
        Intention intention = requireIntention(round.getId(), req.getStudentId());
        if (!Integer.valueOf(1).equals(intention.getAcceptInnerAdjust())) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "学生未勾选服从实训室内部调剂");
        }
        List<IntentionItem> items = listIntentionItems(intention.getId());
        boolean belongs = items.stream().anyMatch(item -> Objects.equals(item.getLabId(), leader.getLabId()));
        if (!belongs) {
            throw new BusinessException(ResultCode.FORBIDDEN, "该学生不属于本实训室");
        }
        ensureNoActiveAdmission(round.getId(), req.getStudentId());
        MentorProfile target = requireTargetMentor(req.getToMentorId());
        if (!Objects.equals(target.getLabId(), leader.getLabId())) {
            throw new BusinessException(ResultCode.FORBIDDEN, "内部调剂只能选择本室导师");
        }
        return applyReallocation(round, req.getStudentId(), leader.getLabId(), target, LEVEL_INNER,
                leaderUserId, req.getReason(), items);
    }

    @Override
    public PageResult<ReallocationCandidateVO> listAdminCandidates(Long roundId, Integer level,
                                                                   long pageNum, long pageSize) {
        if (level == null || level < LEVEL_INNER || level > LEVEL_TALK) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "调剂级别仅支持 1/2/3");
        }
        Long targetRoundId = resolveRoundId(roundId);
        List<ReallocationCandidateVO> candidates = buildCandidates(targetRoundId, level, null);
        return paginate(candidates, pageNum, pageSize);
    }

    @Override
    public AdminReallocationRespVO reallocateByAdmin(Long adminUserId, AdminReallocationReqDTO req) {
        if (req.getLevel() == null || req.getLevel() < LEVEL_INNER || req.getLevel() > LEVEL_TALK) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "调剂级别仅支持 1/2/3");
        }
        if (Integer.valueOf(LEVEL_TALK).equals(req.getLevel()) && StrUtil.isBlank(req.getReason())) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "座谈安置必须填写说明");
        }
        SelectionRound round = requireAdjustableRound(req.getRoundId());
        List<ReallocationFailVO> failList = new ArrayList<>();
        int success = 0;
        for (AdminReallocationItemReqDTO item : req.getItems()) {
            try {
                reallocateOne(adminUserId, round, req.getLevel(), item.getStudentId(),
                        item.getToMentorId(), req.getReason());
                success++;
            } catch (BusinessException exception) {
                SysUser student = sysUserMapper.selectById(item.getStudentId());
                failList.add(new ReallocationFailVO(item.getStudentId(),
                        student == null ? "" : DesensitizeUtils.maskName(student.getRealName()),
                        exception.getMessage()));
            }
        }
        AdminReallocationRespVO resp = new AdminReallocationRespVO();
        resp.setSuccessCount(success);
        resp.setFailCount(failList.size());
        resp.setFailList(failList);
        log.info("管理员批量调剂，roundId={}，level={}，success={}，fail={}",
                round.getId(), req.getLevel(), success, failList.size());
        return resp;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AdmissionAdjustRespVO adjustAdmission(Long adminUserId, Long admissionId, AdmissionAdjustReqDTO req) {
        Admission admission = admissionMapper.selectById(admissionId);
        if (admission == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "录取记录不存在");
        }
        SelectionRound round = selectionRoundMapper.selectById(admission.getRoundId());
        if (round == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "选拔轮次不存在");
        }
        if (Integer.valueOf(LOCKED).equals(round.getLocked())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "批次已锁定或已进入公示，不可调整");
        }
        if (round.getAdjustEnd() != null && LocalDateTime.now().isAfter(round.getAdjustEnd())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "批次已锁定或已进入公示，不可调整");
        }
        String action = req.getAction() == null ? "" : req.getAction().trim().toUpperCase();
        int beforeStatus = Optional.ofNullable(admission.getStatus()).orElse(0);
        Long beforeMentor = admission.getMentorId();
        switch (action) {
            case ACTION_CONFIRM -> confirmAdmission(admission);
            case ACTION_CANCEL -> cancelAdmission(admission, false);
            case ACTION_REASSIGN -> reassignAdmission(admission, req);
            case ACTION_ABANDON -> cancelAdmission(admission, true);
            default -> throw new BusinessException(ResultCode.PARAM_ERROR, "不支持的调整动作");
        }
        writeLog(adminUserId, "ADMISSION", admissionId, "阶段内调整录取-" + action,
                "status=" + beforeStatus + ",mentorId=" + beforeMentor,
                "status=" + admission.getStatus() + ",mentorId=" + admission.getMentorId(), req.getReason());
        AdmissionAdjustRespVO resp = new AdmissionAdjustRespVO();
        resp.setId(admission.getId());
        resp.setStatus(admission.getStatus());
        resp.setMentorId(admission.getMentorId());
        return resp;
    }

    /*
     * 最近一次调剂生成的记录 ID，供响应使用。
     */

    /**
     * 管理员单条调剂。
     *
     * @param adminUserId 管理员用户 ID
     * @param round       轮次
     * @param level       调剂级别
     * @param studentId   学生 ID
     * @param mentorId    目标导师 ID
     * @param reason      理由
     */
    private void reallocateOne(Long adminUserId, SelectionRound round, int level, Long studentId,
                               Long mentorId, String reason) {
        Intention intention = requireIntention(round.getId(), studentId);
        if (Integer.valueOf(LEVEL_INNER).equals(level)
                && !Integer.valueOf(1).equals(intention.getAcceptInnerAdjust())) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "学生未勾选对应级别的调剂意愿");
        }
        if (Integer.valueOf(LEVEL_CROSS).equals(level)
                && !Integer.valueOf(1).equals(intention.getAcceptCrossAdjust())) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "学生未勾选对应级别的调剂意愿");
        }
        if (Integer.valueOf(LEVEL_TALK).equals(level) && StrUtil.isBlank(reason)) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "座谈安置必须填写说明");
        }
        List<IntentionItem> items = listIntentionItems(intention.getId());
        ensureNoActiveAdmission(round.getId(), studentId);
        MentorProfile target = requireTargetMentor(mentorId);
        Set<Long> originLabs = items.stream().map(IntentionItem::getLabId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        if (Integer.valueOf(LEVEL_INNER).equals(level) && !originLabs.contains(target.getLabId())) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "内部调剂只能选择原意向实训室导师");
        }
        if (Integer.valueOf(LEVEL_CROSS).equals(level) && originLabs.contains(target.getLabId())) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "跨室调剂不能选择原意向实训室导师");
        }
        Long fromLabId = Integer.valueOf(LEVEL_TALK).equals(level)
                ? null : items.stream().map(IntentionItem::getLabId).filter(Objects::nonNull).findFirst().orElse(null);
        applyReallocation(round, studentId, fromLabId, target, level, adminUserId, reason, items);
    }

    /**
     * 执行调剂写入：条件占用名额、写调剂记录、录取记录、日志与通知。
     *
     * @param round      轮次
     * @param studentId  学生 ID
     * @param fromLabId  原实训室 ID
     * @param target     目标导师
     * @param level      级别
     * @param operatorId 操作人
     * @param reason     理由
     * @param items      原意向明细
     * @return 调剂记录与录取记录 ID
     */
    private LeaderReallocationRespVO applyReallocation(SelectionRound round, Long studentId, Long fromLabId,
                                                       MentorProfile target, int level, Long operatorId,
                                                       String reason, List<IntentionItem> items) {
        if (mentorProfileMapper.increaseQuotaUsed(target.getId(), 1) == 0) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "目标导师剩余名额不足");
        }
        Long toLabId = target.getLabId();
        Reallocation reallocation = new Reallocation();
        reallocation.setRoundId(round.getId());
        reallocation.setStudentId(studentId);
        reallocation.setFromLabId(fromLabId);
        reallocation.setToLabId(toLabId);
        reallocation.setToMentorId(target.getId());
        reallocation.setLevel(level);
        reallocation.setOperatorId(operatorId);
        reallocation.setReason(reason);
        reallocationMapper.insert(reallocation);
        Admission admission = new Admission();
        admission.setRoundId(round.getId());
        admission.setStudentId(studentId);
        admission.setLabId(toLabId);
        admission.setMentorId(target.getId());
        admission.setSourceType(level == LEVEL_INNER ? 3 : (level == LEVEL_CROSS ? 4 : 5));
        admission.setReallocationId(reallocation.getId());
        admission.setStatus(STATUS_CONFIRMED);
        admission.setActiveFlag(ACTIVE);
        admission.setConfirmTime(LocalDateTime.now());
        admissionMapper.insert(admission);
        writeLog(operatorId, "REALLOCATION", reallocation.getId(), "统筹调剂-level" + level,
                "labId=" + fromLabId, "labId=" + toLabId + ",mentorId=" + target.getId(), reason);
        sendReallocationNotice(studentId, reallocation.getId(), target, level);
        log.info("调剂完成，studentId={}，level={}，toMentorId={}", studentId, level, target.getId());
        LeaderReallocationRespVO resp = new LeaderReallocationRespVO();
        resp.setReallocationId(reallocation.getId());
        resp.setAdmissionId(admission.getId());
        return resp;
    }

    /**
     * 确认录取。
     *
     * @param admission 录取记录
     */
    private void confirmAdmission(Admission admission) {
        Admission update = new Admission();
        update.setId(admission.getId());
        update.setStatus(STATUS_CONFIRMED);
        update.setActiveFlag(ACTIVE);
        update.setConfirmTime(LocalDateTime.now());
        admissionMapper.updateById(update);
        admission.setStatus(STATUS_CONFIRMED);
        admission.setActiveFlag(ACTIVE);
    }

    /**
     * 取消或置放弃录取。
     *
     * @param admission    录取记录
     * @param triggerWaitlist 是否触发递补
     */
    private void cancelAdmission(Admission admission, boolean triggerWaitlist) {
        Admission update = new Admission();
        update.setId(admission.getId());
        update.setStatus(STATUS_ABANDONED);
        admissionMapper.updateById(update);
        admissionMapper.update(null, new UpdateWrapper<Admission>()
                .set("active_flag", null)
                .eq("id", admission.getId()));
        waitlistSupport.releaseQuota(admission.getMentorId());
        if (triggerWaitlist) {
            waitlistSupport.triggerWaitlist(admission.getRoundId(), admission.getMentorId());
        }
        admission.setStatus(STATUS_ABANDONED);
        admission.setActiveFlag(null);
    }

    /**
     * 改派录取导师。
     *
     * @param admission 录取记录
     * @param req       调整请求
     */
    private void reassignAdmission(Admission admission, AdmissionAdjustReqDTO req) {
        if (req.getTargetMentorId() == null) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "改派时必须指定目标导师");
        }
        MentorProfile target = requireTargetMentor(req.getTargetMentorId());
        if (!Objects.equals(admission.getMentorId(), target.getId())) {
            if (mentorProfileMapper.increaseQuotaUsed(target.getId(), 1) == 0) {
                throw new BusinessException(ResultCode.BUSINESS_ERROR, "目标导师剩余名额不足");
            }
            waitlistSupport.releaseQuota(admission.getMentorId());
        }
        Admission update = new Admission();
        update.setId(admission.getId());
        update.setMentorId(target.getId());
        update.setLabId(target.getLabId());
        update.setStatus(STATUS_CONFIRMED);
        update.setActiveFlag(ACTIVE);
        update.setConfirmTime(LocalDateTime.now());
        admissionMapper.updateById(update);
        admission.setMentorId(target.getId());
        admission.setLabId(target.getLabId());
        admission.setStatus(STATUS_CONFIRMED);
        admission.setActiveFlag(ACTIVE);
    }

    /**
     * 构建调剂候选。
     *
     * @param roundId     轮次 ID
     * @param level       级别
     * @param leaderLabId 负责人实训室 ID，可为空
     * @return 候选列表
     */
    private List<ReallocationCandidateVO> buildCandidates(Long roundId, int level, Long leaderLabId) {
        if (roundId == null) {
            return List.of();
        }
        List<Intention> intentions = intentionMapper.selectList(new LambdaQueryWrapper<Intention>()
                .eq(Intention::getRoundId, roundId)
                .eq(Intention::getStatus, 2));
        if (intentions.isEmpty()) {
            return List.of();
        }
        List<Long> intentionIds = intentions.stream().map(Intention::getId).toList();
        Map<Long, List<IntentionItem>> itemMap = intentionItemMapper.selectList(
                        new LambdaQueryWrapper<IntentionItem>().in(IntentionItem::getIntentionId, intentionIds))
                .stream()
                .collect(Collectors.groupingBy(IntentionItem::getIntentionId));
        Set<Long> activeStudents = admissionMapper.selectList(new LambdaQueryWrapper<Admission>()
                        .eq(Admission::getRoundId, roundId)
                        .in(Admission::getStatus, STATUS_PENDING, STATUS_CONFIRMED, STATUS_ENROLLED))
                .stream()
                .map(Admission::getStudentId)
                .collect(Collectors.toSet());
        List<MentorProfile> availableMentors = mentorProfileMapper.selectList(
                new LambdaQueryWrapper<MentorProfile>()
                        .eq(MentorProfile::getStatus, MENTOR_ENABLED));
        Map<Long, Lab> labMap = loadLabs(availableMentors.stream()
                .map(MentorProfile::getLabId).distinct().toList());
        Map<Long, SysUser> mentorUsers = loadUsers(availableMentors.stream()
                .map(MentorProfile::getUserId).toList());
        Map<Long, SysUser> students = loadUsers(intentions.stream().map(Intention::getStudentId).toList());
        Map<Long, BigDecimal> scoreMap = loadScores(roundId);
        List<ReallocationCandidateVO> result = new ArrayList<>();
        for (Intention intention : intentions) {
            if (activeStudents.contains(intention.getStudentId()) || !matchConsent(intention, level)) {
                continue;
            }
            List<IntentionItem> items = itemMap.getOrDefault(intention.getId(), List.of());
            if (items.isEmpty()) {
                continue;
            }
            Set<Long> originLabs = items.stream().map(IntentionItem::getLabId)
                    .filter(Objects::nonNull).collect(Collectors.toSet());
            if (leaderLabId != null && !originLabs.contains(leaderLabId)) {
                continue;
            }
            Long originLabId = leaderLabId != null ? leaderLabId
                    : items.stream().map(IntentionItem::getLabId).filter(Objects::nonNull).findFirst().orElse(null);
            List<ReallocationMentorVO> mentors = availableMentors.stream()
                    .filter(mentor -> remainQuota(mentor) > 0)
                    .filter(mentor -> level == LEVEL_TALK
                            || (level == LEVEL_INNER && Objects.equals(mentor.getLabId(), originLabId))
                            || (level == LEVEL_CROSS && !originLabs.contains(mentor.getLabId())))
                    .map(mentor -> toMentorVO(mentor, labMap.get(mentor.getLabId()),
                            mentorUsers.get(mentor.getUserId())))
                    .toList();
            if (mentors.isEmpty()) {
                continue;
            }
            SysUser student = students.get(intention.getStudentId());
            ReallocationCandidateVO vo = new ReallocationCandidateVO();
            vo.setStudentId(intention.getStudentId());
            vo.setStudentNo(student == null ? "" : DesensitizeUtils.maskUserNo(student.getUserNo()));
            vo.setStudentName(student == null ? "" : DesensitizeUtils.maskName(student.getRealName()));
            vo.setOriginLabId(originLabId);
            Lab originLab = labMap.get(originLabId);
            vo.setOriginLabName(originLab == null ? "" : originLab.getLabName());
            vo.setAcceptInnerAdjust(intention.getAcceptInnerAdjust());
            vo.setAcceptCrossAdjust(intention.getAcceptCrossAdjust());
            vo.setTotalScore(scoreMap.get(intention.getStudentId()));
            vo.setAvailableMentors(mentors);
            result.add(vo);
        }
        result.sort(Comparator.comparing(ReallocationCandidateVO::getTotalScore,
                        Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(ReallocationCandidateVO::getStudentId));
        return result;
    }

    /**
     * 判断学生意愿是否匹配调剂级别。
     *
     * @param intention 意向
     * @param level     级别
     * @return 是否匹配
     */
    private boolean matchConsent(Intention intention, int level) {
        if (level == LEVEL_INNER) {
            return Integer.valueOf(1).equals(intention.getAcceptInnerAdjust());
        }
        if (level == LEVEL_CROSS) {
            return Integer.valueOf(1).equals(intention.getAcceptCrossAdjust());
        }
        return !Integer.valueOf(1).equals(intention.getAcceptInnerAdjust())
                && !Integer.valueOf(1).equals(intention.getAcceptCrossAdjust());
    }

    /**
     * 查询可调剂轮次并校验时间窗与锁定状态。
     *
     * @param roundId 轮次 ID
     * @return 轮次
     */
    private SelectionRound requireAdjustableRound(Long roundId) {
        SelectionRound round = selectionRoundMapper.selectById(roundId);
        if (round == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "选拔轮次不存在");
        }
        if (Integer.valueOf(LOCKED).equals(round.getLocked())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "批次已锁定，不可调剂");
        }
        LocalDateTime now = LocalDateTime.now();
        if (round.getAdjustStart() == null || round.getAdjustEnd() == null
                || now.isBefore(round.getAdjustStart()) || now.isAfter(round.getAdjustEnd())) {
            throw new BusinessException(ResultCode.OUT_OF_TIME_WINDOW, "当前不在调剂时间窗内");
        }
        return round;
    }

    /**
     * 查询学生意向。
     *
     * @param roundId   轮次 ID
     * @param studentId 学生 ID
     * @return 意向
     */
    private Intention requireIntention(Long roundId, Long studentId) {
        Intention intention = intentionMapper.selectOne(new LambdaQueryWrapper<Intention>()
                .eq(Intention::getRoundId, roundId)
                .eq(Intention::getStudentId, studentId));
        if (intention == null) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "学生本轮无所选意向");
        }
        return intention;
    }

    /**
     * 查询意向明细。
     *
     * @param intentionId 意向 ID
     * @return 明细列表
     */
    private List<IntentionItem> listIntentionItems(Long intentionId) {
        return intentionItemMapper.selectList(new LambdaQueryWrapper<IntentionItem>()
                .eq(IntentionItem::getIntentionId, intentionId));
    }

    /**
     * 校验学生本轮无有效录取。
     *
     * @param roundId   轮次 ID
     * @param studentId 学生 ID
     */
    private void ensureNoActiveAdmission(Long roundId, Long studentId) {
        long count = admissionMapper.selectCount(new LambdaQueryWrapper<Admission>()
                .eq(Admission::getRoundId, roundId)
                .eq(Admission::getStudentId, studentId)
                .in(Admission::getStatus, STATUS_PENDING, STATUS_CONFIRMED, STATUS_ENROLLED));
        if (count > 0) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "学生本轮已有录取记录");
        }
    }

    /**
     * 查询并校验目标导师。
     *
     * @param mentorId 导师档案 ID
     * @return 导师档案
     */
    private MentorProfile requireTargetMentor(Long mentorId) {
        MentorProfile mentor = mentorProfileMapper.selectById(mentorId);
        if (mentor == null || !Integer.valueOf(MENTOR_ENABLED).equals(mentor.getStatus())) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "目标导师不可选");
        }
        if (remainQuota(mentor) <= 0) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "目标导师剩余名额不足");
        }
        return mentor;
    }

    /**
     * 计算剩余名额。
     *
     * @param mentor 导师档案
     * @return 剩余名额
     */
    private int remainQuota(MentorProfile mentor) {
        return Math.max(0, Optional.ofNullable(mentor.getQuota()).orElse(0)
                - Optional.ofNullable(mentor.getQuotaUsed()).orElse(0));
    }

    /**
     * 解析轮次 ID。
     *
     * @param roundId 轮次 ID，可为空
     * @return 轮次 ID
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
     * 加载本轮评分最高值。
     *
     * @param roundId 轮次 ID
     * @return 学生 ID 到总分的映射
     */
    private Map<Long, BigDecimal> loadScores(Long roundId) {
        Map<Long, BigDecimal> result = new HashMap<>();
        for (InterviewScore score : interviewScoreMapper.selectList(new LambdaQueryWrapper<InterviewScore>()
                .eq(InterviewScore::getRoundId, roundId))) {
            BigDecimal value = score.getFinalTotal() == null ? score.getSystemTotal() : score.getFinalTotal();
            if (value == null) {
                continue;
            }
            result.merge(score.getStudentId(), value, (first, second) -> first.compareTo(second) >= 0 ? first : second);
        }
        return result;
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
     * 构建可调剂导师项。
     *
     * @param mentor 导师档案
     * @param lab    实训室
     * @param user   教师账号
     * @return 可调剂导师
     */
    private ReallocationMentorVO toMentorVO(MentorProfile mentor, Lab lab, SysUser user) {
        ReallocationMentorVO vo = new ReallocationMentorVO();
        vo.setMentorId(mentor.getId());
        vo.setMentorName(user == null ? "" : user.getRealName());
        vo.setLabId(mentor.getLabId());
        vo.setLabName(lab == null ? "" : lab.getLabName());
        vo.setRemainQuota(remainQuota(mentor));
        return vo;
    }

    /**
     * 分页截取候选。
     *
     * @param candidates 全量候选
     * @param pageNum    页码
     * @param pageSize   每页条数
     * @return 分页结果
     */
    private PageResult<ReallocationCandidateVO> paginate(List<ReallocationCandidateVO> candidates,
                                                         long pageNum, long pageSize) {
        long safePage = Math.max(1, pageNum);
        long safeSize = pageSize < 1 ? 10 : Math.min(pageSize, 100);
        int from = (int) Math.min((safePage - 1) * safeSize, candidates.size());
        int to = (int) Math.min(from + safeSize, candidates.size());
        return new PageResult<>((long) candidates.size(), safePage, safeSize,
                new ArrayList<>(candidates.subList(from, to)));
    }

    /**
     * 写操作日志。
     *
     * @param operatorId 操作人 ID
     * @param bizType    业务类型
     * @param bizId      业务主键
     * @param action     动作
     * @param before     变更前
     * @param after      变更后
     * @param reason     理由
     */
    private void writeLog(Long operatorId, String bizType, Long bizId, String action,
                          String before, String after, String reason) {
        SysUser operator = sysUserMapper.selectById(operatorId);
        OperationLog operationLog = new OperationLog();
        operationLog.setOperatorId(operatorId);
        operationLog.setOperatorName(operator == null ? "" : operator.getRealName());
        operationLog.setBizType(bizType);
        operationLog.setBizId(bizId);
        operationLog.setAction(action);
        operationLog.setBeforeValue(before);
        operationLog.setAfterValue(after);
        operationLog.setReason(reason);
        operationLogMapper.insert(operationLog);
    }

    /**
     * 发送调剂结果通知。
     *
     * @param studentId    学生 ID
     * @param reallocationId 调剂记录 ID
     * @param target       目标导师
     * @param level        级别
     */
    private void sendReallocationNotice(Long studentId, Long reallocationId,
                                        MentorProfile target, int level) {
        SysUser mentorUser = sysUserMapper.selectById(target.getUserId());
        UserNotice notice = new UserNotice();
        notice.setUserId(studentId);
        notice.setTitle("调剂结果已生效");
        notice.setContent("你已被调剂至 " + (mentorUser == null ? "" : mentorUser.getRealName())
                + " 导师，调剂级别：" + level + "。");
        notice.setNoticeType(NOTICE_TYPE_CONFIRM);
        notice.setBizType("REALLOCATION");
        notice.setBizId(reallocationId);
        notice.setIsRead(0);
        try {
            userNoticeMapper.insert(notice);
        } catch (Exception exception) {
            log.info("调剂通知已存在，忽略重复写入，reallocationId={}", reallocationId);
        }
    }
}
