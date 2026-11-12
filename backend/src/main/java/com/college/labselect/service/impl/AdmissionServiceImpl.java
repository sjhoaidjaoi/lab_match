package com.college.labselect.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.college.labselect.common.DesensitizeUtils;
import com.college.labselect.common.ResultCode;
import com.college.labselect.common.StatusTextUtils;
import com.college.labselect.dto.req.ConfirmRespondReqDTO;
import com.college.labselect.dto.resp.AdmissionItemVO;
import com.college.labselect.dto.resp.AdmissionListVO;
import com.college.labselect.dto.resp.ConfirmCenterItemVO;
import com.college.labselect.dto.resp.ConfirmCenterVO;
import com.college.labselect.dto.resp.ConfirmRespondRespVO;
import com.college.labselect.dto.resp.LeaderAdmissionItemVO;
import com.college.labselect.dto.resp.LeaderAdmissionSummaryVO;
import com.college.labselect.entity.Admission;
import com.college.labselect.entity.Lab;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.entity.SysUser;
import com.college.labselect.entity.UserNotice;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.AdmissionMapper;
import com.college.labselect.mapper.LabMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.SelectionRoundMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.mapper.UserNoticeMapper;
import com.college.labselect.service.IAdmissionService;
import com.college.labselect.service.IArchiveService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 录取与确认服务实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdmissionServiceImpl implements IAdmissionService {

    private static final int STATUS_PENDING = 1;
    private static final int STATUS_CONFIRMED = 2;
    private static final int STATUS_ENROLLED = 3;
    private static final int STATUS_ABANDONED = 4;
    private static final int STATUS_TIMEOUT = 5;
    private static final int ACTIVE = 1;
    private static final int LOCKED = 1;
    private static final int NOTICE_TYPE_CONFIRM = 4;
    private static final String REMIND_BIZ_TYPE = "REMIND";
    private static final String ACTION_ACCEPT = "ACCEPT";
    private static final String ACTION_REJECT = "REJECT";

    private final AdmissionMapper admissionMapper;
    private final MentorProfileMapper mentorProfileMapper;
    private final SelectionRoundMapper selectionRoundMapper;
    private final LabMapper labMapper;
    private final SysUserMapper sysUserMapper;
    private final UserNoticeMapper userNoticeMapper;
    private final IArchiveService archiveService;
    private final AdmissionWaitlistSupport waitlistSupport;

    @Override
    public ConfirmCenterVO confirmCenter(Long studentUserId) {
        ConfirmCenterVO result = new ConfirmCenterVO();
        result.setTotal(0);
        result.setItems(List.of());
        SelectionRound round = currentRound();
        LocalDateTime now = LocalDateTime.now();
        if (round == null || (round.getConfirmStart() != null && now.isBefore(round.getConfirmStart()))) {
            return result;
        }
        List<Admission> records = admissionMapper.selectList(new LambdaQueryWrapper<Admission>()
                .eq(Admission::getRoundId, round.getId())
                .eq(Admission::getStudentId, studentUserId)
                .eq(Admission::getStatus, STATUS_PENDING)
                .orderByAsc(Admission::getId));
        if (records.isEmpty()) {
            return result;
        }
        Map<Long, Lab> labMap = loadLabs(records.stream().map(Admission::getLabId).distinct().toList());
        Map<Long, MentorProfile> mentorMap = loadMentors(records.stream()
                .map(Admission::getMentorId).distinct().toList());
        Map<Long, SysUser> userMap = loadUsers(mentorMap.values().stream()
                .map(MentorProfile::getUserId).toList());
        boolean locked = Integer.valueOf(LOCKED).equals(round.getLocked());
        List<ConfirmCenterItemVO> items = new ArrayList<>();
        for (Admission record : records) {
            LocalDateTime deadline = Optional.ofNullable(record.getConfirmDeadline())
                    .orElse(round.getNominationEnd());
            if (deadline != null && now.isAfter(deadline)) {
                continue;
            }
            Lab lab = labMap.get(record.getLabId());
            MentorProfile mentor = mentorMap.get(record.getMentorId());
            SysUser mentorUser = mentor == null ? null : userMap.get(mentor.getUserId());
            ConfirmCenterItemVO item = new ConfirmCenterItemVO();
            item.setId(record.getId());
            item.setAdmissionId(record.getId());
            item.setPendingType(record.getPendingType());
            item.setPendingTypeText(StatusTextUtils.pendingType(record.getPendingType()));
            item.setLabId(record.getLabId());
            item.setLabName(lab == null ? "" : lab.getLabName());
            item.setMentorId(record.getMentorId());
            item.setMentorName(mentorUser == null ? "" : mentorUser.getRealName());
            item.setSourceType(record.getSourceType());
            item.setSourceTypeText(StatusTextUtils.sourceType(record.getSourceType()));
            item.setTotalScore(record.getTotalScore());
            item.setConfirmDeadline(deadline);
            item.setCountdownSeconds(deadline == null ? 0
                    : Math.max(0, Duration.between(now, deadline).getSeconds()));
            item.setActions(locked ? List.of() : List.of(ACTION_ACCEPT, ACTION_REJECT));
            items.add(item);
        }
        result.setTotal(items.size());
        result.setItems(items);
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ConfirmRespondRespVO respond(Long studentUserId, Long admissionId, ConfirmRespondReqDTO req) {
        Admission admission = admissionMapper.selectById(admissionId);
        if (admission == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "待确认记录不存在");
        }
        if (!Objects.equals(admission.getStudentId(), studentUserId)) {
            throw new BusinessException(ResultCode.FORBIDDEN, "无权操作他人的待确认记录");
        }
        if (!Integer.valueOf(STATUS_PENDING).equals(admission.getStatus())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "该待确认记录已处理，不可重复响应");
        }
        SelectionRound round = selectionRoundMapper.selectById(admission.getRoundId());
        if (round != null && Integer.valueOf(LOCKED).equals(round.getLocked())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "批次已锁定，不可操作待确认记录");
        }
        LocalDateTime now = LocalDateTime.now();
        if (round != null && Integer.valueOf(1).equals(admission.getPendingType())
                && round.getConfirmStart() != null && now.isBefore(round.getConfirmStart())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "确认尚未开始");
        }
        LocalDateTime deadline = Optional.ofNullable(admission.getConfirmDeadline())
                .orElse(round == null ? null : round.getNominationEnd());
        if (deadline != null && now.isAfter(deadline)) {
            throw new BusinessException(ResultCode.OUT_OF_TIME_WINDOW, "已超过确认截止时间");
        }
        long finalCount = admissionMapper.selectCount(new LambdaQueryWrapper<Admission>()
                .eq(Admission::getRoundId, admission.getRoundId())
                .eq(Admission::getStudentId, studentUserId)
                .in(Admission::getStatus, STATUS_CONFIRMED, STATUS_ENROLLED));
        if (finalCount > 0) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "本轮已有录取去向，不可重复确认");
        }
        String action = req.getAction() == null ? "" : req.getAction().trim().toUpperCase();
        int status;
        if (ACTION_ACCEPT.equals(action)) {
            status = accept(admission);
        } else if (ACTION_REJECT.equals(action)) {
            status = reject(admission);
        } else {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "不支持的响应动作");
        }
        ConfirmRespondRespVO resp = new ConfirmRespondRespVO();
        resp.setId(admission.getId());
        resp.setStatus(status);
        log.info("学生响应录取，studentId={}，admissionId={}，action={}", studentUserId, admissionId, action);
        return resp;
    }

    @Override
    public AdmissionListVO listTeacherAdmissions(Long teacherUserId, Long roundId) {
        MentorProfile mentor = requireMentor(teacherUserId);
        int quota = Optional.ofNullable(mentor.getQuota()).orElse(0);
        AdmissionListVO result = new AdmissionListVO();
        result.setQuota(quota);
        result.setConfirmedCount(0);
        result.setPendingCount(0);
        result.setRemainQuota(quota);
        result.setItems(List.of());
        SelectionRound round = resolveRound(roundId);
        if (round == null) {
            return result;
        }
        List<Admission> records = admissionMapper.selectList(new LambdaQueryWrapper<Admission>()
                .eq(Admission::getRoundId, round.getId())
                .eq(Admission::getMentorId, mentor.getId())
                .orderByAsc(Admission::getId));
        if (records.isEmpty()) {
            return result;
        }
        int confirmedCount = (int) records.stream()
                .filter(item -> Integer.valueOf(STATUS_CONFIRMED).equals(item.getStatus())
                        || Integer.valueOf(STATUS_ENROLLED).equals(item.getStatus()))
                .count();
        int pendingCount = (int) records.stream()
                .filter(item -> Integer.valueOf(STATUS_PENDING).equals(item.getStatus()))
                .count();
        Map<Long, SysUser> userMap = loadUsers(records.stream().map(Admission::getStudentId).toList());
        List<AdmissionItemVO> items = new ArrayList<>();
        for (Admission record : records) {
            SysUser student = userMap.get(record.getStudentId());
            AdmissionItemVO item = new AdmissionItemVO();
            item.setId(record.getId());
            item.setStudentId(record.getStudentId());
            item.setStudentNo(student == null ? "" : DesensitizeUtils.maskUserNo(student.getUserNo()));
            item.setStudentName(student == null ? "" : DesensitizeUtils.maskName(student.getRealName()));
            item.setStatus(record.getStatus());
            item.setStatusText(StatusTextUtils.admissionStatus(record.getStatus()));
            item.setConfirmTime(record.getConfirmTime());
            items.add(item);
        }
        result.setConfirmedCount(confirmedCount);
        result.setPendingCount(pendingCount);
        result.setRemainQuota(Math.max(0, quota - confirmedCount - pendingCount));
        result.setItems(items);
        return result;
    }

    @Override
    public void remind(Long teacherUserId, Long admissionId) {
        MentorProfile mentor = requireMentor(teacherUserId);
        Admission admission = admissionMapper.selectById(admissionId);
        if (admission == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "录取记录不存在");
        }
        if (!Objects.equals(admission.getMentorId(), mentor.getId())) {
            throw new BusinessException(ResultCode.FORBIDDEN, "无权操作他人的录取记录");
        }
        if (!Integer.valueOf(STATUS_PENDING).equals(admission.getStatus())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "该录取记录无需提醒");
        }
        SelectionRound round = selectionRoundMapper.selectById(admission.getRoundId());
        if (round != null && Integer.valueOf(LOCKED).equals(round.getLocked())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "批次已锁定，不可发送提醒");
        }
        Long bizId = Long.valueOf(LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE));
        long exists = userNoticeMapper.selectCount(new LambdaQueryWrapper<UserNotice>()
                .eq(UserNotice::getUserId, admission.getStudentId())
                .eq(UserNotice::getBizType, REMIND_BIZ_TYPE)
                .eq(UserNotice::getBizId, bizId)
                .eq(UserNotice::getNoticeType, NOTICE_TYPE_CONFIRM));
        if (exists > 0) {
            return;
        }
        UserNotice notice = new UserNotice();
        notice.setUserId(admission.getStudentId());
        notice.setTitle("请尽快确认录取");
        notice.setContent("你有一条待确认的录取记录，请在确认截止时间前完成选择。");
        notice.setNoticeType(NOTICE_TYPE_CONFIRM);
        notice.setBizType(REMIND_BIZ_TYPE);
        notice.setBizId(bizId);
        notice.setIsRead(0);
        try {
            userNoticeMapper.insert(notice);
            log.info("发送确认提醒，mentorId={}，admissionId={}", mentor.getId(), admissionId);
        } catch (DuplicateKeyException e) {
            log.info("确认提醒已发送，忽略重复请求，admissionId={}", admissionId);
        }
    }

    @Override
    public LeaderAdmissionSummaryVO listLeaderAdmissions(Long leaderUserId, Long roundId, boolean finalOnly) {
        Lab lab = requireLeaderLab(leaderUserId);
        LeaderAdmissionSummaryVO result = new LeaderAdmissionSummaryVO();
        result.setLabId(lab.getId());
        result.setLabName(lab.getLabName());
        int labQuota = Optional.ofNullable(lab.getTotalQuota()).orElse(0);
        result.setLabQuota(labQuota);
        result.setAllocatedQuota(0);
        result.setQuotaUsed(0);
        result.setRemainQuota(labQuota);
        result.setTotalCount(0);
        result.setPendingCount(0);
        result.setConfirmedCount(0);
        result.setEnrolledCount(0);
        result.setAbandonedCount(0);
        result.setItems(List.of());
        SelectionRound round = resolveRound(roundId);
        if (round == null) {
            return result;
        }
        result.setRoundId(round.getId());
        List<MentorProfile> mentors = mentorProfileMapper.selectList(new LambdaQueryWrapper<MentorProfile>()
                .eq(MentorProfile::getLabId, lab.getId()));
        int allocatedQuota = mentors.stream()
                .mapToInt(mentor -> Optional.ofNullable(mentor.getQuota()).orElse(0)).sum();
        int quotaUsed = mentors.stream()
                .mapToInt(mentor -> Optional.ofNullable(mentor.getQuotaUsed()).orElse(0)).sum();
        result.setAllocatedQuota(allocatedQuota);
        result.setQuotaUsed(quotaUsed);
        result.setRemainQuota(Math.max(Math.max(labQuota, allocatedQuota) - quotaUsed, 0));
        List<Admission> records = admissionMapper.selectList(new LambdaQueryWrapper<Admission>()
                .eq(Admission::getRoundId, round.getId())
                .eq(Admission::getLabId, lab.getId())
                .orderByAsc(Admission::getId));
        result.setTotalCount(records.size());
        result.setPendingCount((int) records.stream()
                .filter(item -> Integer.valueOf(STATUS_PENDING).equals(item.getStatus())).count());
        result.setConfirmedCount((int) records.stream()
                .filter(item -> Integer.valueOf(STATUS_CONFIRMED).equals(item.getStatus())).count());
        result.setEnrolledCount((int) records.stream()
                .filter(item -> Integer.valueOf(STATUS_ENROLLED).equals(item.getStatus())).count());
        result.setAbandonedCount((int) records.stream()
                .filter(item -> Integer.valueOf(STATUS_ABANDONED).equals(item.getStatus())
                        || Integer.valueOf(STATUS_TIMEOUT).equals(item.getStatus())).count());
        List<Admission> visible = finalOnly
                ? records.stream()
                .filter(item -> Integer.valueOf(STATUS_CONFIRMED).equals(item.getStatus())
                        || Integer.valueOf(STATUS_ENROLLED).equals(item.getStatus()))
                .toList()
                : records;
        if (visible.isEmpty()) {
            return result;
        }
        Map<Long, SysUser> studentMap = loadUsers(visible.stream()
                .map(Admission::getStudentId).distinct().toList());
        List<Long> mentorIds = visible.stream()
                .map(Admission::getMentorId).filter(Objects::nonNull).distinct().toList();
        Map<Long, MentorProfile> mentorMap = mentorIds.isEmpty() ? new HashMap<>()
                : mentorProfileMapper.selectBatchIds(mentorIds).stream()
                .collect(Collectors.toMap(MentorProfile::getId, Function.identity(), (first, second) -> first));
        Map<Long, SysUser> mentorUserMap = loadUsers(mentorMap.values().stream()
                .map(MentorProfile::getUserId).filter(Objects::nonNull).distinct().toList());
        List<LeaderAdmissionItemVO> items = new ArrayList<>();
        for (Admission admission : visible) {
            SysUser student = studentMap.get(admission.getStudentId());
            MentorProfile mentor = mentorMap.get(admission.getMentorId());
            SysUser mentorUser = mentor == null ? null : mentorUserMap.get(mentor.getUserId());
            LeaderAdmissionItemVO vo = new LeaderAdmissionItemVO();
            vo.setId(admission.getId());
            vo.setStudentId(admission.getStudentId());
            vo.setStudentNo(student == null ? "" : DesensitizeUtils.maskUserNo(student.getUserNo()));
            vo.setStudentName(student == null ? "" : DesensitizeUtils.maskName(student.getRealName()));
            vo.setMentorId(admission.getMentorId());
            vo.setMentorName(mentorUser == null ? "" : mentorUser.getRealName());
            vo.setTotalScore(admission.getTotalScore());
            vo.setStatus(admission.getStatus());
            vo.setStatusText(StatusTextUtils.admissionStatus(admission.getStatus()));
            vo.setSourceType(admission.getSourceType());
            vo.setSourceTypeText(StatusTextUtils.sourceType(admission.getSourceType()));
            vo.setConfirmTime(admission.getConfirmTime());
            vo.setConfirmDeadline(admission.getConfirmDeadline());
            items.add(vo);
        }
        items.sort(Comparator.comparing(LeaderAdmissionItemVO::getStatus,
                        Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(LeaderAdmissionItemVO::getMentorId,
                        Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(LeaderAdmissionItemVO::getStudentId,
                        Comparator.nullsLast(Comparator.naturalOrder())));
        result.setItems(items);
        return result;
    }

    @Override
    public byte[] exportLeaderAdmissions(Long leaderUserId, Long roundId) {
        Lab lab = requireLeaderLab(leaderUserId);
        return archiveService.exportResults(roundId, lab.getId(), null);
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
            throw new BusinessException(ResultCode.FORBIDDEN, "仅实训室负责人可查看本室录取情况");
        }
        return lab;
    }

    /**
     * 接受录取并释放该生其他待确认记录。
     *
     * @param admission 待确认记录
     * @return 目标状态
     */
    private int accept(Admission admission) {
        Admission update = new Admission();
        update.setStatus(STATUS_CONFIRMED);
        update.setActiveFlag(ACTIVE);
        update.setConfirmTime(LocalDateTime.now());
        int updated = admissionMapper.update(update, new UpdateWrapper<Admission>()
                .eq("id", admission.getId())
                .eq("status", STATUS_PENDING));
        if (updated == 0) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "该待确认记录已处理，不可重复响应");
        }
        List<Admission> others = admissionMapper.selectList(new LambdaQueryWrapper<Admission>()
                .eq(Admission::getRoundId, admission.getRoundId())
                .eq(Admission::getStudentId, admission.getStudentId())
                .eq(Admission::getStatus, STATUS_PENDING)
                .ne(Admission::getId, admission.getId()));
        for (Admission other : others) {
            Admission abandon = new Admission();
            abandon.setId(other.getId());
            abandon.setStatus(STATUS_ABANDONED);
            admissionMapper.updateById(abandon);
            waitlistSupport.releaseQuota(other.getMentorId());
            waitlistSupport.triggerWaitlist(other.getRoundId(), other.getMentorId());
        }
        return STATUS_CONFIRMED;
    }

    /**
     * 拒绝录取，释放名额并触发递补。
     *
     * @param admission 待确认记录
     * @return 目标状态
     */
    private int reject(Admission admission) {
        Admission update = new Admission();
        update.setStatus(STATUS_ABANDONED);
        int updated = admissionMapper.update(update, new UpdateWrapper<Admission>()
                .eq("id", admission.getId())
                .eq("status", STATUS_PENDING));
        if (updated == 0) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "该待确认记录已处理，不可重复响应");
        }
        waitlistSupport.releaseQuota(admission.getMentorId());
        waitlistSupport.triggerWaitlist(admission.getRoundId(), admission.getMentorId());
        return STATUS_ABANDONED;
    }

    /**
     * 查询当前导师档案。
     *
     * @param teacherUserId 教师用户 ID
     * @return 导师档案
     */
    private MentorProfile requireMentor(Long teacherUserId) {
        MentorProfile mentor = mentorProfileMapper.selectOne(new LambdaQueryWrapper<MentorProfile>()
                .eq(MentorProfile::getUserId, teacherUserId));
        if (mentor == null) {
            throw new BusinessException(ResultCode.FORBIDDEN, "仅导师可操作录取名单");
        }
        return mentor;
    }

    /**
     * 按 ID 或最近轮次解析轮次。
     *
     * @param roundId 轮次 ID，可为空
     * @return 选拔轮次，可能为空
     */
    private SelectionRound resolveRound(Long roundId) {
        return roundId == null ? currentRound() : selectionRoundMapper.selectById(roundId);
    }

    /**
     * 查询最近一轮轮次。
     *
     * @return 当前轮次，可能为空
     */
    private SelectionRound currentRound() {
        return selectionRoundMapper.selectOne(new LambdaQueryWrapper<SelectionRound>()
                .orderByDesc(SelectionRound::getRoundNo)
                .last("LIMIT 1"));
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
