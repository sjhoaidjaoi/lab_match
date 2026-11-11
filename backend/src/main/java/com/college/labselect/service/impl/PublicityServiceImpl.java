package com.college.labselect.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.college.labselect.common.DesensitizeUtils;
import com.college.labselect.common.PageResult;
import com.college.labselect.common.ResultCode;
import com.college.labselect.common.StatusTextUtils;
import com.college.labselect.dto.req.PublicityCreateReqDTO;
import com.college.labselect.dto.resp.PublicityConfirmRespVO;
import com.college.labselect.dto.resp.PublicityCreateRespVO;
import com.college.labselect.dto.resp.PublicityDetailVO;
import com.college.labselect.dto.resp.PublicityListVO;
import com.college.labselect.dto.resp.PublicityRowVO;
import com.college.labselect.entity.Admission;
import com.college.labselect.entity.Dispute;
import com.college.labselect.entity.Lab;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.Notice;
import com.college.labselect.entity.OperationLog;
import com.college.labselect.entity.Publicity;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.entity.SysUser;
import com.college.labselect.entity.UserNotice;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.AdmissionMapper;
import com.college.labselect.mapper.DisputeMapper;
import com.college.labselect.mapper.LabMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.NoticeMapper;
import com.college.labselect.mapper.OperationLogMapper;
import com.college.labselect.mapper.PublicityMapper;
import com.college.labselect.mapper.SelectionRoundMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.mapper.UserNoticeMapper;
import com.college.labselect.service.IPublicityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 公示批次服务实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PublicityServiceImpl implements IPublicityService {

    private static final int STATUS_PUBLICITY_ACTIVE = 1;
    private static final int STATUS_PUBLICITY_ENDED = 2;
    private static final int STATUS_PUBLICITY_CONFIRMED = 3;
    private static final int ADMISSION_PENDING = 1;
    private static final int ADMISSION_CONFIRMED = 2;
    private static final int ADMISSION_ENROLLED = 3;
    private static final int DISPUTE_PENDING = 1;
    private static final int NOTICE_TYPE_PUBLICITY = 3;
    private static final int NOTICE_TYPE_CONFIRM = 4;
    private static final int USER_NOTICE_PUBLICITY = 5;

    private final PublicityMapper publicityMapper;
    private final DisputeMapper disputeMapper;
    private final AdmissionMapper admissionMapper;
    private final SelectionRoundMapper selectionRoundMapper;
    private final NoticeMapper noticeMapper;
    private final UserNoticeMapper userNoticeMapper;
    private final SysUserMapper sysUserMapper;
    private final LabMapper labMapper;
    private final MentorProfileMapper mentorProfileMapper;
    private final OperationLogMapper operationLogMapper;

    @Override
    public PageResult<PublicityListVO> listPublicities(Long roundId, Integer status, long pageNum, long pageSize) {
        Page<Publicity> page = publicityMapper.selectPage(new Page<>(pageNum, pageSize),
                new LambdaQueryWrapper<Publicity>()
                        .eq(roundId != null, Publicity::getRoundId, roundId)
                        .eq(status != null, Publicity::getStatus, status)
                        .orderByDesc(Publicity::getId));
        Map<Long, SelectionRound> roundMap = loadRounds(page.getRecords().stream()
                .map(Publicity::getRoundId).distinct().toList());
        IPage<PublicityListVO> result = page.convert(publicity -> {
            PublicityListVO vo = new PublicityListVO();
            vo.setId(publicity.getId());
            vo.setRoundId(publicity.getRoundId());
            SelectionRound round = roundMap.get(publicity.getRoundId());
            vo.setRoundName(round == null ? "" : round.getRoundName());
            vo.setTitle(publicity.getTitle());
            vo.setStartTime(publicity.getStartTime());
            vo.setEndTime(publicity.getEndTime());
            vo.setStatus(publicity.getStatus());
            vo.setStatusText(StatusTextUtils.publicityStatus(publicity.getStatus()));
            vo.setAdmissionCount(admissionMapper.selectCount(new LambdaQueryWrapper<Admission>()
                    .eq(Admission::getRoundId, publicity.getRoundId())
                    .in(Admission::getStatus, ADMISSION_CONFIRMED, ADMISSION_ENROLLED)).intValue());
            vo.setDisputeCount(disputeMapper.selectCount(new LambdaQueryWrapper<Dispute>()
                    .eq(Dispute::getPublicityId, publicity.getId())).intValue());
            vo.setPendingDisputeCount(disputeMapper.selectCount(new LambdaQueryWrapper<Dispute>()
                    .eq(Dispute::getPublicityId, publicity.getId())
                    .eq(Dispute::getStatus, DISPUTE_PENDING)).intValue());
            vo.setRemainSeconds(Integer.valueOf(STATUS_PUBLICITY_ACTIVE).equals(publicity.getStatus())
                    && publicity.getEndTime() != null
                    ? Math.max(0, Duration.between(LocalDateTime.now(), publicity.getEndTime()).getSeconds()) : 0L);
            return vo;
        });
        return PageResult.of(result);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PublicityCreateRespVO createPublicity(Long adminUserId, PublicityCreateReqDTO req) {
        SelectionRound round = selectionRoundMapper.selectById(req.getRoundId());
        if (round == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "选拔轮次不存在");
        }
        long pending = admissionMapper.selectCount(new LambdaQueryWrapper<Admission>()
                .eq(Admission::getRoundId, round.getId())
                .eq(Admission::getStatus, ADMISSION_PENDING));
        if (pending > 0) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "仍有 " + pending + " 条录取待确认");
        }
        long active = publicityMapper.selectCount(new LambdaQueryWrapper<Publicity>()
                .eq(Publicity::getRoundId, round.getId())
                .eq(Publicity::getStatus, STATUS_PUBLICITY_ACTIVE));
        if (active > 0) {
            throw new BusinessException(ResultCode.DUPLICATE_SUBMIT, "已有进行中的公示批次");
        }
        List<Admission> admissions = admissionMapper.selectList(new LambdaQueryWrapper<Admission>()
                .eq(Admission::getRoundId, round.getId())
                .in(Admission::getStatus, ADMISSION_CONFIRMED, ADMISSION_ENROLLED));
        LocalDateTime startTime = LocalDateTime.now().withNano(0);
        Publicity publicity = new Publicity();
        publicity.setRoundId(round.getId());
        publicity.setTitle(req.getTitle());
        publicity.setStartTime(startTime);
        publicity.setEndTime(startTime.plusHours(req.getDurationHours()));
        publicity.setStatus(STATUS_PUBLICITY_ACTIVE);
        publicity.setPublisherId(adminUserId);
        publicityMapper.insert(publicity);

        Notice notice = new Notice();
        notice.setTitle(req.getTitle());
        notice.setNoticeType(NOTICE_TYPE_PUBLICITY);
        notice.setContent("本轮拟录取名单已进入公示，公示截止时间：" + publicity.getEndTime());
        notice.setStatus(2);
        notice.setPublishTime(startTime);
        notice.setPublisherId(adminUserId);
        noticeMapper.insert(notice);

        for (Long studentId : new LinkedHashSet<>(admissions.stream()
                .map(Admission::getStudentId).toList())) {
            insertUserNotice(studentId, "拟录取名单公示", "本轮拟录取名单已公示，如有异议请在公示期内提交。",
                    publicity.getId(), USER_NOTICE_PUBLICITY);
        }
        writeLog(adminUserId, "PUBLICITY", publicity.getId(), "发起公示",
                "status=0", "status=" + STATUS_PUBLICITY_ACTIVE, req.getTitle());
        PublicityCreateRespVO resp = new PublicityCreateRespVO();
        resp.setId(publicity.getId());
        resp.setStartTime(publicity.getStartTime());
        resp.setEndTime(publicity.getEndTime());
        resp.setAdmissionCount(admissions.size());
        resp.setStatus(STATUS_PUBLICITY_ACTIVE);
        return resp;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void endPublicity(Long adminUserId, Long id) {
        Publicity publicity = requirePublicity(id);
        if (!Integer.valueOf(STATUS_PUBLICITY_ACTIVE).equals(publicity.getStatus())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "当前公示不可结束");
        }
        publicity.setStatus(STATUS_PUBLICITY_ENDED);
        publicity.setEndTime(LocalDateTime.now().withNano(0));
        publicityMapper.updateById(publicity);
        writeLog(adminUserId, "PUBLICITY", id, "结束公示",
                "status=1", "status=2", null);
        log.info("结束公示，publicityId={}", id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PublicityConfirmRespVO confirmFinal(Long adminUserId, Long id) {
        Publicity publicity = requirePublicity(id);
        if (!Integer.valueOf(STATUS_PUBLICITY_ENDED).equals(publicity.getStatus())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "公示尚未结束，无法确认最终名单");
        }
        long pending = disputeMapper.selectCount(new LambdaQueryWrapper<Dispute>()
                .eq(Dispute::getPublicityId, id)
                .eq(Dispute::getStatus, DISPUTE_PENDING));
        if (pending > 0) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "仍有 " + pending + " 条异议未处理，无法确认");
        }
        List<Admission> admissions = admissionMapper.selectList(new LambdaQueryWrapper<Admission>()
                .eq(Admission::getRoundId, publicity.getRoundId())
                .in(Admission::getStatus, ADMISSION_CONFIRMED, ADMISSION_ENROLLED));
        for (Admission admission : admissions) {
            Admission update = new Admission();
            update.setId(admission.getId());
            update.setStatus(ADMISSION_ENROLLED);
            update.setActiveFlag(1);
            admissionMapper.updateById(update);
            insertUserNotice(admission.getStudentId(), "最终名单已确认", "你已被正式录取，请等待入组安排。",
                    id, NOTICE_TYPE_CONFIRM);
        }
        publicity.setStatus(STATUS_PUBLICITY_CONFIRMED);
        publicityMapper.updateById(publicity);
        writeLog(adminUserId, "PUBLICITY", id, "确认最终名单",
                "status=2", "status=3", null);
        PublicityConfirmRespVO resp = new PublicityConfirmRespVO();
        resp.setConfirmedCount(admissions.size());
        resp.setStatus(STATUS_PUBLICITY_CONFIRMED);
        log.info("确认最终名单，publicityId={}，count={}", id, admissions.size());
        return resp;
    }

    @Override
    public PublicityDetailVO getStudentPublicity(Long studentUserId, Long id) {
        Publicity publicity = requirePublicity(id);
        List<Admission> admissions = admissionMapper.selectList(new LambdaQueryWrapper<Admission>()
                .eq(Admission::getRoundId, publicity.getRoundId())
                .in(Admission::getStatus, ADMISSION_CONFIRMED, ADMISSION_ENROLLED)
                .orderByAsc(Admission::getId));
        Map<Long, SysUser> studentMap = loadUsers(admissions.stream()
                .map(Admission::getStudentId).distinct().toList());
        Map<Long, Lab> labMap = loadLabs(admissions.stream()
                .map(Admission::getLabId).distinct().toList());
        Map<Long, MentorProfile> mentorMap = loadMentors(admissions.stream()
                .map(Admission::getMentorId).distinct().toList());
        Map<Long, SysUser> mentorUserMap = loadUsers(mentorMap.values().stream()
                .map(MentorProfile::getUserId).toList());
        List<PublicityRowVO> rows = new ArrayList<>();
        for (Admission admission : admissions) {
            boolean self = Objects.equals(admission.getStudentId(), studentUserId);
            SysUser student = studentMap.get(admission.getStudentId());
            Lab lab = labMap.get(admission.getLabId());
            MentorProfile mentor = mentorMap.get(admission.getMentorId());
            SysUser mentorUser = mentor == null ? null : mentorUserMap.get(mentor.getUserId());
            PublicityRowVO row = new PublicityRowVO();
            row.setStudentNo(student == null ? "" : (self ? student.getUserNo()
                    : DesensitizeUtils.maskUserNo(student.getUserNo())));
            row.setStudentName(student == null ? "" : (self ? student.getRealName()
                    : DesensitizeUtils.maskName(student.getRealName())));
            row.setLabName(lab == null ? "" : lab.getLabName());
            row.setMentorName(mentorUser == null ? "" : mentorUser.getRealName());
            row.setIsSelf(self ? 1 : 0);
            rows.add(row);
        }
        PublicityDetailVO vo = new PublicityDetailVO();
        vo.setId(publicity.getId());
        vo.setTitle(publicity.getTitle());
        vo.setStartTime(publicity.getStartTime());
        vo.setEndTime(publicity.getEndTime());
        vo.setStatus(publicity.getStatus());
        LocalDateTime now = LocalDateTime.now();
        vo.setCanDispute(Integer.valueOf(STATUS_PUBLICITY_ACTIVE).equals(publicity.getStatus())
                && publicity.getStartTime() != null && publicity.getEndTime() != null
                && !now.isBefore(publicity.getStartTime()) && !now.isAfter(publicity.getEndTime()) ? 1 : 0);
        vo.setList(rows);
        return vo;
    }

    /**
     * 查询公示批次。
     *
     * @param id 公示 ID
     * @return 公示批次
     */
    private Publicity requirePublicity(Long id) {
        Publicity publicity = publicityMapper.selectById(id);
        if (publicity == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "公示批次不存在");
        }
        return publicity;
    }

    /**
     * 批量加载轮次。
     *
     * @param roundIds 轮次 ID 列表
     * @return 轮次映射
     */
    private Map<Long, SelectionRound> loadRounds(List<Long> roundIds) {
        if (roundIds.isEmpty()) {
            return new HashMap<>();
        }
        return selectionRoundMapper.selectBatchIds(roundIds).stream()
                .collect(Collectors.toMap(SelectionRound::getId, Function.identity(), (first, second) -> first));
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
                .collect(Collectors.toMap(MentorProfile::getId, Function.identity(), (first, second) -> first));
    }

    /**
     * 写入站内通知。
     *
     * @param userId    接收人
     * @param title     标题
     * @param content   内容
     * @param bizId     业务主键
     * @param noticeType 通知类型
     */
    private void insertUserNotice(Long userId, String title, String content, Long bizId, int noticeType) {
        UserNotice notice = new UserNotice();
        notice.setUserId(userId);
        notice.setTitle(title);
        notice.setContent(content);
        notice.setNoticeType(noticeType);
        notice.setBizType("PUBLICITY");
        notice.setBizId(bizId);
        notice.setIsRead(0);
        try {
            userNoticeMapper.insert(notice);
        } catch (Exception exception) {
            log.info("公示通知已存在，忽略重复写入，userId={}", userId);
        }
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
}
