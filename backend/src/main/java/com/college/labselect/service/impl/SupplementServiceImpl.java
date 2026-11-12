package com.college.labselect.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.college.labselect.common.DesensitizeUtils;
import com.college.labselect.common.PageResult;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.SupplementDirectAdmitReqDTO;
import com.college.labselect.dto.req.TakeReallocationReqDTO;
import com.college.labselect.dto.resp.AvailableMentorVO;
import com.college.labselect.dto.resp.ReallocationPoolItemVO;
import com.college.labselect.dto.resp.ReallocationPoolVO;
import com.college.labselect.dto.resp.SupplementDirectAdmitRespVO;
import com.college.labselect.dto.resp.TakeReallocationRespVO;
import com.college.labselect.entity.Admission;
import com.college.labselect.entity.Intention;
import com.college.labselect.entity.IntentionItem;
import com.college.labselect.entity.Lab;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.OperationLog;
import com.college.labselect.entity.Reallocation;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.entity.StudentProfile;
import com.college.labselect.entity.SysUser;
import com.college.labselect.entity.UserNotice;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.AdmissionMapper;
import com.college.labselect.mapper.IntentionItemMapper;
import com.college.labselect.mapper.IntentionMapper;
import com.college.labselect.mapper.LabMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.OperationLogMapper;
import com.college.labselect.mapper.ReallocationMapper;
import com.college.labselect.mapper.SelectionRoundMapper;
import com.college.labselect.mapper.StudentProfileMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.mapper.UserNoticeMapper;
import com.college.labselect.service.ISupplementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
 * 补录与跨室调剂池服务实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SupplementServiceImpl implements ISupplementService {

    private static final int STATUS_PENDING = 1;
    private static final int STATUS_CONFIRMED = 2;
    private static final int STATUS_ENROLLED = 3;
    private static final int STATUS_ABANDONED = 4;
    private static final int STATUS_OVERDUE = 5;
    private static final int ACTIVE = 1;
    private static final int LOCKED = 1;
    private static final int MENTOR_ENABLED = 1;
    private static final int INTENTION_SUBMITTED = 2;
    private static final int NOTICE_TYPE_CONFIRM = 4;
    private static final int STATEMENT_SUMMARY_LENGTH = 80;

    private final SelectionRoundMapper selectionRoundMapper;
    private final AdmissionMapper admissionMapper;
    private final MentorProfileMapper mentorProfileMapper;
    private final IntentionMapper intentionMapper;
    private final IntentionItemMapper intentionItemMapper;
    private final StudentProfileMapper studentProfileMapper;
    private final ReallocationMapper reallocationMapper;
    private final OperationLogMapper operationLogMapper;
    private final LabMapper labMapper;
    private final SysUserMapper sysUserMapper;
    private final UserNoticeMapper userNoticeMapper;

    @Override
    public PageResult<AvailableMentorVO> listSupplementMentors(Long studentUserId) {
        SelectionRound round = currentRound();
        if (round == null) {
            return new PageResult<>(0L, 1L, 10L, List.of());
        }
        if (round.getRoundNo() != null && round.getRoundNo() <= 1) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "当前不在补录轮次");
        }
        ensureNoActiveAdmission(round.getId(), studentUserId,
                "你本轮已有录取去向，不可参与补录", ResultCode.FORBIDDEN);
        List<MentorProfile> mentors = mentorProfileMapper.selectList(new LambdaQueryWrapper<MentorProfile>()
                .eq(MentorProfile::getStatus, MENTOR_ENABLED)
                .orderByAsc(MentorProfile::getId));
        Map<Long, SysUser> userMap = loadUsers(mentors.stream().map(MentorProfile::getUserId).toList());
        Map<Long, Lab> labMap = loadLabs(mentors.stream().map(MentorProfile::getLabId).distinct().toList());
        List<AvailableMentorVO> list = new ArrayList<>();
        for (MentorProfile mentor : mentors) {
            int remain = remainQuota(mentor);
            if (remain <= 0) {
                continue;
            }
            SysUser user = userMap.get(mentor.getUserId());
            Lab lab = labMap.get(mentor.getLabId());
            AvailableMentorVO vo = new AvailableMentorVO();
            vo.setMentorId(mentor.getId());
            vo.setMentorName(user == null ? "" : user.getRealName());
            vo.setTitle(user == null ? "" : user.getTitle());
            vo.setLabId(mentor.getLabId());
            vo.setLabName(lab == null ? "" : lab.getLabName());
            vo.setResearchDirection(mentor.getResearchDirection());
            vo.setQuota(Optional.ofNullable(mentor.getQuota()).orElse(0));
            vo.setQuotaUsed(Optional.ofNullable(mentor.getQuotaUsed()).orElse(0));
            vo.setRemainQuota(remain);
            vo.setSelectable(1);
            list.add(vo);
        }
        return new PageResult<>((long) list.size(), 1L, (long) Math.max(1, list.size()), list);
    }

    @Override
    public ReallocationPoolVO listTeacherPool(Long teacherUserId, Long roundId, String keyword,
                                              long pageNum, long pageSize) {
        MentorProfile mentor = requireMentor(teacherUserId);
        ReallocationPoolVO result = new ReallocationPoolVO();
        result.setTotal(0L);
        result.setPageNum(pageNum);
        result.setPageSize(pageSize);
        result.setMyRemainQuota(remainQuota(mentor));
        result.setList(List.of());
        Long targetRoundId = resolveRoundId(roundId);
        if (targetRoundId == null) {
            return result;
        }
        SelectionRound round = selectionRoundMapper.selectById(targetRoundId);
        LocalDateTime now = LocalDateTime.now();
        if (round == null || round.getAdjustStart() == null || round.getAdjustEnd() == null
                || now.isBefore(round.getAdjustStart()) || now.isAfter(round.getAdjustEnd())) {
            return result;
        }
        List<Intention> intentions = intentionMapper.selectList(new LambdaQueryWrapper<Intention>()
                .eq(Intention::getRoundId, round.getId())
                .eq(Intention::getStatus, INTENTION_SUBMITTED)
                .eq(Intention::getAcceptCrossAdjust, 1));
        if (intentions.isEmpty()) {
            return result;
        }
        Map<Long, Admission> admissionMap = admissionMapper.selectList(new LambdaQueryWrapper<Admission>()
                        .eq(Admission::getRoundId, round.getId())
                        .in(Admission::getStatus, STATUS_PENDING, STATUS_CONFIRMED, STATUS_ENROLLED))
                .stream()
                .collect(Collectors.toMap(Admission::getStudentId, Function.identity(), (first, second) -> first));
        Set<Long> exitedStudentIds = loadExitedStudentIds(round.getId());
        Map<Long, SysUser> userMap = loadUsers(intentions.stream().map(Intention::getStudentId).toList());
        Map<Long, StudentProfile> profileMap = studentProfileMapper.selectList(
                        new LambdaQueryWrapper<StudentProfile>()
                                .in(StudentProfile::getUserId, intentions.stream()
                                        .map(Intention::getStudentId).toList()))
                .stream()
                .collect(Collectors.toMap(StudentProfile::getUserId, Function.identity(), (first, second) -> first));
        Map<Long, Lab> labMap = loadLabs(admissionMap.values().stream()
                .map(Admission::getLabId).distinct().toList());
        String text = StrUtil.trim(keyword);
        List<ReallocationPoolItemVO> all = new ArrayList<>();
        for (Intention intention : intentions) {
            if (exitedStudentIds.contains(intention.getStudentId())) {
                continue;
            }
            SysUser student = userMap.get(intention.getStudentId());
            if (StrUtil.isNotBlank(text)
                    && !StrUtil.containsIgnoreCase(student == null ? "" : student.getUserNo(), text)
                    && !StrUtil.containsIgnoreCase(student == null ? "" : student.getRealName(), text)) {
                continue;
            }
            StudentProfile profile = profileMap.get(intention.getStudentId());
            Admission taken = admissionMap.get(intention.getStudentId());
            ReallocationPoolItemVO vo = new ReallocationPoolItemVO();
            vo.setStudentId(intention.getStudentId());
            vo.setStudentNo(student == null ? "" : DesensitizeUtils.maskUserNo(student.getUserNo()));
            vo.setStudentName(student == null ? "" : DesensitizeUtils.maskName(student.getRealName()));
            vo.setCollege(student == null ? "" : student.getCollege());
            vo.setMajor(student == null ? "" : student.getMajor());
            vo.setGrade(student == null ? "" : student.getGrade());
            vo.setStatementSummary(statementSummary(profile));
            vo.setHasFullArchive(Integer.valueOf(1).equals(intention.getPoolConsent()) ? 1 : 0);
            vo.setProgrammingLanguages(profile == null || StrUtil.isBlank(profile.getProgrammingLanguages())
                    ? List.of() : StrUtil.split(profile.getProgrammingLanguages(), ','));
            vo.setWeeklyHours(profile == null ? null : profile.getWeeklyHours());
            vo.setTaken(taken == null ? 0 : 1);
            if (taken != null) {
                Lab lab = labMap.get(taken.getLabId());
                vo.setTakenLabName(lab == null ? "" : lab.getLabName());
            }
            all.add(vo);
        }
        all.sort(Comparator.comparing(ReallocationPoolItemVO::getTaken)
                .thenComparing(ReallocationPoolItemVO::getStudentId));
        long safePage = Math.max(1, pageNum);
        long safeSize = pageSize < 1 ? 10 : Math.min(pageSize, 100);
        int from = (int) Math.min((safePage - 1) * safeSize, all.size());
        int to = (int) Math.min(from + safeSize, all.size());
        result.setTotal((long) all.size());
        result.setPageNum(safePage);
        result.setPageSize(safeSize);
        result.setList(new ArrayList<>(all.subList(from, to)));
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public TakeReallocationRespVO take(Long teacherUserId, Long studentId, TakeReallocationReqDTO req) {
        MentorProfile mentor = requireMentor(teacherUserId);
        SelectionRound round = currentRound();
        if (round == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "当前无选拔轮次");
        }
        LocalDateTime now = LocalDateTime.now();
        if (Integer.valueOf(LOCKED).equals(round.getLocked())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "批次已锁定，不可抢录");
        }
        if (round.getAdjustStart() == null || round.getAdjustEnd() == null
                || now.isBefore(round.getAdjustStart()) || now.isAfter(round.getAdjustEnd())) {
            throw new BusinessException(ResultCode.OUT_OF_TIME_WINDOW, "当前不在调剂时间窗内");
        }
        ensurePoolEligible(round.getId(), studentId);
        ensureNoActiveAdmission(round.getId(), studentId, "该生本轮已有录取记录", ResultCode.DUPLICATE_SUBMIT);
        if (remainQuota(mentor) <= 0) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "个人剩余名额不足");
        }
        if (increaseQuota(mentor.getId()) == 0) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "个人剩余名额不足");
        }
        Reallocation reallocation = new Reallocation();
        reallocation.setRoundId(round.getId());
        reallocation.setStudentId(studentId);
        reallocation.setToLabId(mentor.getLabId());
        reallocation.setToMentorId(mentor.getId());
        reallocation.setLevel(2);
        reallocation.setOperatorId(teacherUserId);
        reallocation.setReason(req.getReason());
        reallocationMapper.insert(reallocation);
        Admission admission = buildAdmission(round.getId(), studentId, mentor, 4);
        admission.setReallocationId(reallocation.getId());
        try {
            admissionMapper.insert(admission);
        } catch (DuplicateKeyException exception) {
            throw new BusinessException(ResultCode.DUPLICATE_SUBMIT, takenMessage(round.getId(), studentId));
        }
        writeLog(teacherUserId, "REALLOCATION", reallocation.getId(), "跨室调剂抢录",
                "studentId=" + studentId, "mentorId=" + mentor.getId(), req.getReason());
        notifyStudent(studentId, mentor, "你已被 " + mentorName(mentor) + " 导师抢录。");
        TakeReallocationRespVO resp = new TakeReallocationRespVO();
        resp.setAdmissionId(admission.getId());
        resp.setMentorId(mentor.getId());
        log.info("抢录成功，studentId={}，mentorId={}", studentId, mentor.getId());
        return resp;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public SupplementDirectAdmitRespVO directAdmit(Long teacherUserId, SupplementDirectAdmitReqDTO req) {
        SelectionRound round = selectionRoundMapper.selectById(req.getRoundId());
        if (round == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "选拔轮次不存在");
        }
        if (round.getRoundNo() == null || round.getRoundNo() <= 1) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "首轮不支持直接录入");
        }
        if (round.getAdjustStart() != null && !LocalDateTime.now().isBefore(round.getAdjustStart())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "当前不在补录轮或已进入调剂阶段");
        }
        MentorProfile mentor = requireMentor(teacherUserId);
        Intention intention = intentionMapper.selectOne(new LambdaQueryWrapper<Intention>()
                .eq(Intention::getRoundId, round.getId())
                .eq(Intention::getStudentId, req.getStudentId()));
        if (intention == null || !Integer.valueOf(INTENTION_SUBMITTED).equals(intention.getStatus())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "该生未将你列为补录意向");
        }
        long itemCount = intentionItemMapper.selectCount(new LambdaQueryWrapper<IntentionItem>()
                .eq(IntentionItem::getIntentionId, intention.getId()));
        long intendedCount = intentionItemMapper.selectCount(new LambdaQueryWrapper<IntentionItem>()
                .eq(IntentionItem::getIntentionId, intention.getId())
                .eq(IntentionItem::getMentorId, mentor.getId()));
        if (itemCount != 1 || intendedCount != 1) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "该生未将你列为补录意向");
        }
        ensureNoActiveAdmission(round.getId(), req.getStudentId(), "该生本轮已有录取记录", ResultCode.STATUS_NOT_ALLOWED);
        if (remainQuota(mentor) <= 0) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "个人剩余名额不足");
        }
        if (increaseQuota(mentor.getId()) == 0) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "个人剩余名额不足");
        }
        Admission admission = buildAdmission(round.getId(), req.getStudentId(), mentor, 1);
        admissionMapper.insert(admission);
        writeLog(teacherUserId, "SUPPLEMENT", admission.getId(), "补录直接录入",
                "studentId=" + req.getStudentId(), "mentorId=" + mentor.getId(), req.getReason());
        notifyStudent(req.getStudentId(), mentor, "你已被 " + mentorName(mentor) + " 导师补录。");
        SupplementDirectAdmitRespVO resp = new SupplementDirectAdmitRespVO();
        resp.setAdmissionId(admission.getId());
        resp.setStatus(STATUS_CONFIRMED);
        log.info("补录直接录入，studentId={}，mentorId={}", req.getStudentId(), mentor.getId());
        return resp;
    }

    /**
     * 构建直接生效的录取记录。
     *
     * @param roundId   轮次 ID
     * @param studentId 学生 ID
     * @param mentor    导师档案
     * @param source    来源类型
     * @return 录取记录
     */
    private Admission buildAdmission(Long roundId, Long studentId, MentorProfile mentor, int source) {
        Admission admission = new Admission();
        admission.setRoundId(roundId);
        admission.setStudentId(studentId);
        admission.setLabId(mentor.getLabId());
        admission.setMentorId(mentor.getId());
        admission.setSourceType(source);
        admission.setStatus(STATUS_CONFIRMED);
        admission.setActiveFlag(ACTIVE);
        admission.setConfirmTime(LocalDateTime.now().withNano(0));
        return admission;
    }

    /**
     * 条件占用一个名额。
     *
     * @param mentorId 导师档案 ID
     * @return 受影响行数
     */
    private int increaseQuota(Long mentorId) {
        return mentorProfileMapper.update(null, new UpdateWrapper<MentorProfile>()
                .setSql("quota_used = quota_used + 1, version = version + 1")
                .eq("id", mentorId)
                .apply("quota_used < quota"));
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
            throw new BusinessException(ResultCode.FORBIDDEN, "仅在职导师可操作");
        }
        return mentor;
    }

    /**
     * 校验学生本轮无有效录取。
     *
     * @param roundId   轮次 ID
     * @param studentId 学生 ID
     * @param message   提示
     * @param code      错误码
     */
    private void ensureNoActiveAdmission(Long roundId, Long studentId, String message, ResultCode code) {
        long count = admissionMapper.selectCount(new LambdaQueryWrapper<Admission>()
                .eq(Admission::getRoundId, roundId)
                .eq(Admission::getStudentId, studentId)
                .in(Admission::getStatus, STATUS_PENDING, STATUS_CONFIRMED, STATUS_ENROLLED));
        if (count > 0) {
            throw new BusinessException(code, message);
        }
    }

    /**
     * 校验学生是否具备全院调剂池抢录资格。
     *
     * @param roundId   轮次 ID
     * @param studentId 学生 ID
     */
    private void ensurePoolEligible(Long roundId, Long studentId) {
        Intention intention = intentionMapper.selectOne(new LambdaQueryWrapper<Intention>()
                .eq(Intention::getRoundId, roundId)
                .eq(Intention::getStudentId, studentId));
        if (intention == null
                || !Integer.valueOf(INTENTION_SUBMITTED).equals(intention.getStatus())
                || !Integer.valueOf(1).equals(intention.getAcceptCrossAdjust())) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "该生未进入全院调剂池");
        }
        if (loadExitedStudentIds(roundId).contains(studentId)) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "该生已退出本轮调剂池");
        }
    }

    /**
     * 查询本轮已放弃 / 逾期未确认而退出调剂池的学生。
     *
     * @param roundId 轮次 ID
     * @return 学生 ID 集合
     */
    private Set<Long> loadExitedStudentIds(Long roundId) {
        return admissionMapper.selectList(new LambdaQueryWrapper<Admission>()
                        .eq(Admission::getRoundId, roundId)
                        .in(Admission::getStatus, STATUS_ABANDONED, STATUS_OVERDUE))
                .stream()
                .map(Admission::getStudentId)
                .collect(Collectors.toSet());
    }

    /**
     * 构造抢录并发冲突提示，优先指出已被哪个实训室录入。
     *
     * @param roundId   轮次 ID
     * @param studentId 学生 ID
     * @return 提示文案
     */
    private String takenMessage(Long roundId, Long studentId) {
        Admission taken = admissionMapper.selectOne(new LambdaQueryWrapper<Admission>()
                .eq(Admission::getRoundId, roundId)
                .eq(Admission::getStudentId, studentId)
                .in(Admission::getStatus, STATUS_CONFIRMED, STATUS_ENROLLED)
                .last("LIMIT 1"));
        if (taken == null) {
            return "该生本轮已有录取记录";
        }
        Lab lab = labMapper.selectById(taken.getLabId());
        return lab == null ? "该生本轮已有录取记录" : "该生已被" + lab.getLabName() + "录入";
    }

    /**
     * 查询最近轮次。
     *
     * @return 选拔轮次，可能为空
     */
    private SelectionRound currentRound() {
        return selectionRoundMapper.selectOne(new LambdaQueryWrapper<SelectionRound>()
                .orderByDesc(SelectionRound::getRoundNo)
                .last("LIMIT 1"));
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
        SelectionRound round = currentRound();
        return round == null ? null : round.getId();
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
     * 取陈述摘要。
     *
     * @param profile 学生档案
     * @return 前 80 字摘要
     */
    private String statementSummary(StudentProfile profile) {
        if (profile == null || StrUtil.isBlank(profile.getStatement())) {
            return "";
        }
        String statement = profile.getStatement();
        return statement.length() <= STATEMENT_SUMMARY_LENGTH
                ? statement : statement.substring(0, STATEMENT_SUMMARY_LENGTH);
    }

    /**
     * 取导师姓名。
     *
     * @param mentor 导师档案
     * @return 导师姓名
     */
    private String mentorName(MentorProfile mentor) {
        SysUser user = sysUserMapper.selectById(mentor.getUserId());
        return user == null ? "" : user.getRealName();
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
     * 写操作日志。
     *
     * @param operatorId 操作人
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
     * 发送补录 / 抢录通知。
     *
     * @param studentId 学生 ID
     * @param mentor    导师档案
     * @param content   内容
     */
    private void notifyStudent(Long studentId, MentorProfile mentor, String content) {
        UserNotice notice = new UserNotice();
        notice.setUserId(studentId);
        notice.setTitle("录取结果已生效");
        notice.setContent(content);
        notice.setNoticeType(NOTICE_TYPE_CONFIRM);
        notice.setBizType("SUPPLEMENT");
        notice.setBizId(mentor.getId());
        notice.setIsRead(0);
        try {
            userNoticeMapper.insert(notice);
        } catch (Exception exception) {
            log.info("补录通知已存在，忽略重复写入，studentId={}", studentId);
        }
    }
}
