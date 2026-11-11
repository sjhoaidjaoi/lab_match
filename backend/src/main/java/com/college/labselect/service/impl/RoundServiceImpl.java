package com.college.labselect.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.college.labselect.common.PageResult;
import com.college.labselect.common.ResultCode;
import com.college.labselect.common.StatusTextUtils;
import com.college.labselect.dto.req.RoundBaseReqDTO;
import com.college.labselect.dto.req.RoundCreateReqDTO;
import com.college.labselect.dto.req.RoundStatusReqDTO;
import com.college.labselect.dto.req.RoundUpdateReqDTO;
import com.college.labselect.dto.resp.CurrentRoundVO;
import com.college.labselect.dto.resp.RoundListVO;
import com.college.labselect.entity.Admission;
import com.college.labselect.entity.InterviewScore;
import com.college.labselect.entity.Nomination;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.entity.UserNotice;
import com.college.labselect.entity.Waitlist;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.AdmissionMapper;
import com.college.labselect.mapper.InterviewScoreMapper;
import com.college.labselect.mapper.NominationMapper;
import com.college.labselect.mapper.SelectionRoundMapper;
import com.college.labselect.mapper.UserNoticeMapper;
import com.college.labselect.mapper.WaitlistMapper;
import com.college.labselect.service.IRoundService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 选拔轮次服务实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RoundServiceImpl implements IRoundService {

    private static final int STATUS_NOT_STARTED = 1;
    private static final int STATUS_APPLYING = 2;
    private static final int STATUS_INTERVIEWING = 3;
    private static final int STATUS_FINISHED = 5;
    private static final int LOCKED = 1;
    private static final int NOMINATION_SUBMITTED = 2;
    private static final int ADMISSION_PENDING = 1;
    private static final int ADMISSION_CONFIRMED = 2;
    private static final int ADMISSION_ENROLLED = 3;
    private static final int SCORE_SUBMITTED = 2;
    private static final int WAITLIST_PENDING = 1;
    private static final int NOTICE_TYPE_CONFIRM = 4;
    private static final BigDecimal WEIGHT_TOTAL = new BigDecimal("100.00");

    private final SelectionRoundMapper selectionRoundMapper;
    private final NominationMapper nominationMapper;
    private final AdmissionMapper admissionMapper;
    private final InterviewScoreMapper interviewScoreMapper;
    private final WaitlistMapper waitlistMapper;
    private final UserNoticeMapper userNoticeMapper;

    @Override
    public PageResult<RoundListVO> pageRounds(long pageNum, long pageSize) {
        Page<SelectionRound> page = selectionRoundMapper.selectPage(new Page<>(pageNum, pageSize),
                new LambdaQueryWrapper<SelectionRound>().orderByAsc(SelectionRound::getRoundNo));
        return PageResult.of(page.convert(this::toListVO));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long createRound(RoundCreateReqDTO req) {
        validateTimeline(req);
        validateWeights(req);
        long duplicate = selectionRoundMapper.selectCount(new LambdaQueryWrapper<SelectionRound>()
                .eq(SelectionRound::getRoundNo, req.getRoundNo()));
        if (duplicate > 0) {
            throw new BusinessException(ResultCode.DUPLICATE_SUBMIT, "轮次序号已存在");
        }
        checkOverlap(null, req);
        SelectionRound round = new SelectionRound();
        round.setRoundNo(req.getRoundNo());
        fillRound(round, req);
        round.setStatus(STATUS_NOT_STARTED);
        round.setLocked(0);
        selectionRoundMapper.insert(round);
        log.info("新建选拔轮次，roundId={}，roundNo={}", round.getId(), round.getRoundNo());
        return round.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateRound(Long id, RoundUpdateReqDTO req) {
        SelectionRound round = requireRound(id);
        if (Integer.valueOf(LOCKED).equals(round.getLocked())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "批次已锁定，不可修改轮次配置");
        }
        if (round.getStatus() != null && round.getStatus() >= STATUS_INTERVIEWING && weightChanged(round, req)) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "轮次已进入面试阶段，四维权重不可修改");
        }
        validateTimeline(req);
        validateWeights(req);
        checkOverlap(id, req);
        fillRound(round, req);
        selectionRoundMapper.updateById(round);
        log.info("修改选拔轮次配置，roundId={}", id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateStatus(Long id, RoundStatusReqDTO req) {
        SelectionRound round = requireRound(id);
        if (Integer.valueOf(LOCKED).equals(round.getLocked())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "批次已锁定，不可变更轮次状态");
        }
        if (Integer.valueOf(STATUS_APPLYING).equals(req.getStatus())) {
            long running = selectionRoundMapper.selectCount(new LambdaQueryWrapper<SelectionRound>()
                    .ne(SelectionRound::getId, id)
                    .in(SelectionRound::getStatus, STATUS_APPLYING, STATUS_INTERVIEWING, 4));
            if (running > 0) {
                throw new BusinessException(ResultCode.DUPLICATE_SUBMIT, "已有轮次正在进行");
            }
        }
        round.setStatus(req.getStatus());
        selectionRoundMapper.updateById(round);
        log.info("变更轮次状态，roundId={}，status={}", id, req.getStatus());
    }

    @Override
    public CurrentRoundVO getCurrentRound() {
        SelectionRound round = selectionRoundMapper.selectOne(new LambdaQueryWrapper<SelectionRound>()
                .orderByDesc(SelectionRound::getRoundNo)
                .last("LIMIT 1"));
        if (round == null) {
            return null;
        }
        LocalDateTime now = LocalDateTime.now();
        CurrentRoundVO vo = new CurrentRoundVO();
        vo.setId(round.getId());
        vo.setRoundNo(round.getRoundNo());
        vo.setRoundName(round.getRoundName());
        vo.setStatus(round.getStatus());
        vo.setStatusText(StatusTextUtils.roundStatus(round.getStatus()));
        vo.setApplyStart(round.getApplyStart());
        vo.setApplyEnd(round.getApplyEnd());
        vo.setInterviewStart(round.getInterviewStart());
        vo.setInterviewEnd(round.getInterviewEnd());
        vo.setNominationStart(round.getNominationStart());
        vo.setNominationSubmitEnd(round.getNominationSubmitEnd());
        vo.setConfirmStart(round.getConfirmStart());
        vo.setNominationEnd(round.getNominationEnd());
        vo.setInnerAdjustStart(round.getInnerAdjustStart());
        vo.setInnerAdjustEnd(round.getInnerAdjustEnd());
        vo.setAdjustStart(round.getAdjustStart());
        vo.setAdjustEnd(round.getAdjustEnd());
        vo.setLocked(round.getLocked());
        vo.setServerTime(now);
        String phase = resolvePhase(round, now);
        vo.setPhase(phase);
        vo.setCountdownSeconds(countdown(round, phase, now));
        return vo;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void issueRound(Long id) {
        SelectionRound round = requireRound(id);
        List<Nomination> nominations = nominationMapper.selectList(new LambdaQueryWrapper<Nomination>()
                .eq(Nomination::getRoundId, id)
                .eq(Nomination::getStatus, NOMINATION_SUBMITTED));
        if (nominations.isEmpty()) {
            return;
        }
        Set<Long> existingStudents = admissionMapper.selectList(new LambdaQueryWrapper<Admission>()
                        .eq(Admission::getRoundId, id)
                        .in(Admission::getStatus, ADMISSION_PENDING, ADMISSION_CONFIRMED, ADMISSION_ENROLLED))
                .stream()
                .map(Admission::getStudentId)
                .collect(Collectors.toSet());
        Map<Long, List<Nomination>> byStudent = nominations.stream()
                .collect(Collectors.groupingBy(Nomination::getStudentId));
        for (Map.Entry<Long, List<Nomination>> entry : byStudent.entrySet()) {
            if (existingStudents.contains(entry.getKey())) {
                continue;
            }
            List<Nomination> studentNominations = entry.getValue();
            Long firstAdmissionId = null;
            boolean single = studentNominations.size() == 1;
            for (Nomination nomination : studentNominations) {
                Admission admission = new Admission();
                admission.setRoundId(id);
                admission.setStudentId(nomination.getStudentId());
                admission.setLabId(nomination.getLabId());
                admission.setMentorId(nomination.getMentorId());
                admission.setSourceType(1);
                admission.setNominationId(nomination.getId());
                admission.setTotalScore(nomination.getTotalScore());
                if (single) {
                    admission.setStatus(ADMISSION_CONFIRMED);
                    admission.setActiveFlag(1);
                    admission.setConfirmTime(LocalDateTime.now());
                } else {
                    admission.setStatus(ADMISSION_PENDING);
                    admission.setPendingType(1);
                    admission.setConfirmDeadline(round.getNominationEnd());
                }
                admissionMapper.insert(admission);
                if (firstAdmissionId == null) {
                    firstAdmissionId = admission.getId();
                }
            }
            sendIssueNotice(entry.getKey(), firstAdmissionId, single);
        }
        int waitlistCount = generateWaitlist(id, nominations);
        log.info("批次签发完成，roundId={}，studentCount={}，waitlistCount={}", id, byStudent.size(), waitlistCount);
    }

    /**
     * 为本轮「有评分但未被拟录取」的学生生成递补队列。
     * 按导师分组，总分降序排列，同分按学生 ID 升序；已存在的组合跳过，保证重复签发幂等。
     *
     * @param roundId     轮次 ID
     * @param nominations 本轮已提交的拟录取记录
     * @return 新写入的递补记录数
     */
    private int generateWaitlist(Long roundId, List<Nomination> nominations) {
        List<InterviewScore> scores = interviewScoreMapper.selectList(new LambdaQueryWrapper<InterviewScore>()
                .eq(InterviewScore::getRoundId, roundId)
                .eq(InterviewScore::getStatus, SCORE_SUBMITTED));
        if (scores.isEmpty()) {
            return 0;
        }
        Set<Long> admittedStudents = admissionMapper.selectList(new LambdaQueryWrapper<Admission>()
                        .eq(Admission::getRoundId, roundId))
                .stream()
                .map(Admission::getStudentId)
                .collect(Collectors.toSet());
        Set<String> nominatedKeys = nominations.stream()
                .map(item -> item.getMentorId() + ":" + item.getStudentId())
                .collect(Collectors.toSet());
        List<Waitlist> existing = waitlistMapper.selectList(new LambdaQueryWrapper<Waitlist>()
                .eq(Waitlist::getRoundId, roundId));
        Set<String> existingKeys = existing.stream()
                .map(item -> item.getMentorId() + ":" + item.getStudentId())
                .collect(Collectors.toSet());
        Map<Long, Integer> maxRanks = existing.stream()
                .collect(Collectors.toMap(Waitlist::getMentorId, Waitlist::getRankNo, Math::max));
        Map<Long, List<InterviewScore>> byMentor = scores.stream()
                .filter(item -> !nominatedKeys.contains(item.getMentorId() + ":" + item.getStudentId()))
                .filter(item -> !admittedStudents.contains(item.getStudentId()))
                .collect(Collectors.groupingBy(InterviewScore::getMentorId));
        LocalDateTime now = LocalDateTime.now();
        int inserted = 0;
        for (Map.Entry<Long, List<InterviewScore>> entry : byMentor.entrySet()) {
            List<InterviewScore> sorted = entry.getValue().stream()
                    .sorted(Comparator.comparing(
                                    (InterviewScore item) -> Optional.ofNullable(item.getFinalTotal()).orElse(BigDecimal.ZERO))
                            .reversed()
                            .thenComparing(InterviewScore::getStudentId))
                    .toList();
            int rankNo = maxRanks.getOrDefault(entry.getKey(), 0);
            for (InterviewScore score : sorted) {
                String key = entry.getKey() + ":" + score.getStudentId();
                if (existingKeys.contains(key)) {
                    continue;
                }
                Waitlist waitlist = new Waitlist();
                waitlist.setRoundId(roundId);
                waitlist.setMentorId(entry.getKey());
                waitlist.setStudentId(score.getStudentId());
                waitlist.setRankNo(++rankNo);
                waitlist.setIsManual(0);
                waitlist.setApplyStatus(WAITLIST_PENDING);
                waitlist.setGmtCreate(now);
                waitlist.setGmtModified(now);
                waitlistMapper.insert(waitlist);
                existingKeys.add(key);
                inserted++;
            }
        }
        return inserted;
    }

    /**
     * 查询轮次，不存在返回 404001。
     *
     * @param id 轮次 ID
     * @return 选拔轮次
     */
    private SelectionRound requireRound(Long id) {
        SelectionRound round = selectionRoundMapper.selectById(id);
        if (round == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "选拔轮次不存在");
        }
        return round;
    }

    /**
     * 校验时间窗顺序。
     *
     * @param req 轮次请求
     */
    private void validateTimeline(RoundBaseReqDTO req) {
        if (!req.getApplyStart().isBefore(req.getApplyEnd())) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "填报开始时间必须早于填报结束时间");
        }
        if (req.getInterviewStart().isBefore(req.getApplyEnd())) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "面试开始时间不得早于填报结束时间");
        }
        if (!req.getInterviewStart().isBefore(req.getInterviewEnd())) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "面试开始时间必须早于面试结束时间");
        }
        if (req.getNominationStart().isBefore(req.getInterviewEnd())) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "名单提交开始时间不得早于面试结束时间");
        }
        if (!req.getNominationStart().isBefore(req.getNominationSubmitEnd())) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "名单提交截止必须晚于名单提交开始");
        }
        if (!req.getNominationSubmitEnd().isBefore(req.getConfirmStart())) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "名单提交截止必须早于学生确认开始");
        }
        if (!req.getConfirmStart().isBefore(req.getNominationEnd())) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "学生确认开始必须早于确认截止");
        }
        if (req.getAdjustStart().isBefore(req.getNominationEnd())) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "调剂开始时间不得早于确认截止时间");
        }
        if (!req.getAdjustStart().isBefore(req.getAdjustEnd())) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "调剂开始时间必须早于调剂结束时间");
        }
        validateInnerAdjustTimeline(req);
    }

    /**
     * 校验阶段 6 内部调剂时间窗。
     *
     * @param req 轮次请求
     */
    private void validateInnerAdjustTimeline(RoundBaseReqDTO req) {
        LocalDateTime start = req.getInnerAdjustStart();
        LocalDateTime end = req.getInnerAdjustEnd();
        if (start == null && end == null) {
            return;
        }
        if (start == null || end == null) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "内部调剂开始与结束时间需同时填写");
        }
        if (start.isBefore(req.getNominationEnd())) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "内部调剂开始时间不得早于确认截止时间");
        }
        if (!start.isBefore(end)) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "内部调剂开始时间必须早于内部调剂结束时间");
        }
        if (end.isAfter(req.getAdjustStart())) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "内部调剂结束时间不得晚于跨室调剂开始时间");
        }
    }

    /**
     * 校验四维权重合计为 100。
     *
     * @param req 轮次请求
     */
    private void validateWeights(RoundBaseReqDTO req) {
        BigDecimal sum = req.getWeightAttitude().add(req.getWeightLogic())
                .add(req.getWeightProgramming()).add(req.getWeightTime());
        if (sum.compareTo(WEIGHT_TOTAL) != 0) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "四维权重合计必须为 100");
        }
    }

    /**
     * 校验与其他轮次时间窗不重叠。
     *
     * @param currentId 当前轮次 ID，新建时为空
     * @param req       轮次请求
     */
    private void checkOverlap(Long currentId, RoundBaseReqDTO req) {
        List<SelectionRound> others = selectionRoundMapper.selectList(new LambdaQueryWrapper<SelectionRound>()
                .ne(currentId != null, SelectionRound::getId, currentId));
        for (SelectionRound other : others) {
            if (other.getApplyStart() == null || other.getAdjustEnd() == null) {
                continue;
            }
            boolean overlap = req.getApplyStart().isBefore(other.getAdjustEnd())
                    && other.getApplyStart().isBefore(req.getAdjustEnd());
            if (overlap) {
                throw new BusinessException(ResultCode.BUSINESS_ERROR,
                        "本轮时间窗与第 " + other.getRoundNo() + " 轮重叠");
            }
        }
    }

    /**
     * 判断四维权重是否发生变化。
     *
     * @param round 原轮次
     * @param req   修改请求
     * @return 是否变化
     */
    private boolean weightChanged(SelectionRound round, RoundUpdateReqDTO req) {
        return compare(round.getWeightAttitude(), req.getWeightAttitude())
                || compare(round.getWeightLogic(), req.getWeightLogic())
                || compare(round.getWeightProgramming(), req.getWeightProgramming())
                || compare(round.getWeightTime(), req.getWeightTime());
    }

    /**
     * 比较两个权重。
     *
     * @param first  原值
     * @param second 新值
     * @return 是否不同
     */
    private boolean compare(BigDecimal first, BigDecimal second) {
        return first == null ? second != null : second == null || first.compareTo(second) != 0;
    }

    /**
     * 填充轮次字段。
     *
     * @param round 轮次实体
     * @param req   轮次请求
     */
    private void fillRound(SelectionRound round, RoundBaseReqDTO req) {
        round.setRoundName(req.getRoundName());
        round.setApplyStart(req.getApplyStart());
        round.setApplyEnd(req.getApplyEnd());
        round.setInterviewStart(req.getInterviewStart());
        round.setInterviewEnd(req.getInterviewEnd());
        round.setNominationStart(req.getNominationStart());
        round.setNominationSubmitEnd(req.getNominationSubmitEnd());
        round.setConfirmStart(req.getConfirmStart());
        round.setNominationEnd(req.getNominationEnd());
        round.setInnerAdjustStart(req.getInnerAdjustStart());
        round.setInnerAdjustEnd(req.getInnerAdjustEnd());
        round.setAdjustStart(req.getAdjustStart());
        round.setAdjustEnd(req.getAdjustEnd());
        round.setWeightAttitude(req.getWeightAttitude());
        round.setWeightLogic(req.getWeightLogic());
        round.setWeightProgramming(req.getWeightProgramming());
        round.setWeightTime(req.getWeightTime());
    }

    /**
     * 解析当前阶段。
     *
     * @param round 选拔轮次
     * @param now   当前时间
     * @return 阶段标识
     */
    private String resolvePhase(SelectionRound round, LocalDateTime now) {
        if (Integer.valueOf(LOCKED).equals(round.getLocked())) {
            return "LOCKED";
        }
        if (inRange(now, round.getApplyStart(), round.getApplyEnd())) {
            return "APPLY";
        }
        if (inRange(now, round.getInterviewStart(), round.getInterviewEnd())) {
            return "INTERVIEW";
        }
        if (inRange(now, round.getNominationStart(), round.getNominationSubmitEnd())) {
            return "NOMINATION";
        }
        if (inRange(now, round.getConfirmStart(), round.getNominationEnd())) {
            return "CONFIRM";
        }
        if (inRange(now, round.getInnerAdjustStart(), round.getInnerAdjustEnd())) {
            return "INNER_ADJUST";
        }
        if (inRange(now, round.getAdjustStart(), round.getAdjustEnd())) {
            return "ADJUST";
        }
        if (round.getAdjustEnd() != null && now.isAfter(round.getAdjustEnd())) {
            return "PUBLICITY";
        }
        return "IDLE";
    }

    /**
     * 判断时间是否落在闭区间内。
     *
     * @param now   当前时间
     * @param start 开始时间
     * @param end   结束时间
     * @return 是否在区间内
     */
    private boolean inRange(LocalDateTime now, LocalDateTime start, LocalDateTime end) {
        return start != null && end != null && !now.isBefore(start) && !now.isAfter(end);
    }

    /**
     * 计算当前阶段剩余秒数。
     *
     * @param round 选拔轮次
     * @param phase 阶段
     * @param now   当前时间
     * @return 剩余秒数
     */
    private long countdown(SelectionRound round, String phase, LocalDateTime now) {
        LocalDateTime target = switch (phase) {
            case "APPLY" -> round.getApplyEnd();
            case "INTERVIEW" -> round.getInterviewEnd();
            case "NOMINATION" -> round.getNominationSubmitEnd();
            case "CONFIRM" -> round.getNominationEnd();
            case "INNER_ADJUST" -> round.getInnerAdjustEnd();
            case "ADJUST" -> round.getAdjustEnd();
            case "IDLE" -> now.isBefore(round.getApplyStart()) ? round.getApplyStart() : null;
            default -> null;
        };
        return target == null ? 0 : Math.max(0, Duration.between(now, target).getSeconds());
    }

    /**
     * 发送批次签发结果通知。
     *
     * @param studentId 学生用户 ID
     * @param bizId     业务主键
     * @param single    是否单 offer 自动确认
     */
    private void sendIssueNotice(Long studentId, Long bizId, boolean single) {
        if (bizId == null) {
            return;
        }
        UserNotice notice = new UserNotice();
        notice.setUserId(studentId);
        notice.setTitle(single ? "录取结果已确认" : "录取结果已生成");
        notice.setContent(single ? "你本轮仅有一条拟录取，系统已自动确认。"
                : "你本轮收到多条拟录取，请在确认截止前选择唯一去向。");
        notice.setNoticeType(NOTICE_TYPE_CONFIRM);
        notice.setBizType("ADMISSION_ISSUE");
        notice.setBizId(bizId);
        notice.setIsRead(0);
        try {
            userNoticeMapper.insert(notice);
        } catch (Exception exception) {
            log.info("签发通知已存在，忽略重复写入，studentId={}", studentId);
        }
    }

    /**
     * 轮次实体转列表项。
     *
     * @param round 轮次实体
     * @return 列表项
     */
    private RoundListVO toListVO(SelectionRound round) {
        RoundListVO vo = new RoundListVO();
        vo.setId(round.getId());
        vo.setRoundNo(round.getRoundNo());
        vo.setRoundName(round.getRoundName());
        vo.setStatus(round.getStatus());
        vo.setStatusText(StatusTextUtils.roundStatus(round.getStatus()));
        vo.setApplyStart(round.getApplyStart());
        vo.setApplyEnd(round.getApplyEnd());
        vo.setInterviewStart(round.getInterviewStart());
        vo.setInterviewEnd(round.getInterviewEnd());
        vo.setNominationStart(round.getNominationStart());
        vo.setNominationSubmitEnd(round.getNominationSubmitEnd());
        vo.setConfirmStart(round.getConfirmStart());
        vo.setNominationEnd(round.getNominationEnd());
        vo.setInnerAdjustStart(round.getInnerAdjustStart());
        vo.setInnerAdjustEnd(round.getInnerAdjustEnd());
        vo.setAdjustStart(round.getAdjustStart());
        vo.setAdjustEnd(round.getAdjustEnd());
        vo.setWeightAttitude(round.getWeightAttitude());
        vo.setWeightLogic(round.getWeightLogic());
        vo.setWeightProgramming(round.getWeightProgramming());
        vo.setWeightTime(round.getWeightTime());
        vo.setLocked(round.getLocked());
        return vo;
    }
}
