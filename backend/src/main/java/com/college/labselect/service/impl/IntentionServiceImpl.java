package com.college.labselect.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.college.labselect.common.PageResult;
import com.college.labselect.common.ResultCode;
import com.college.labselect.common.StatusTextUtils;
import com.college.labselect.dto.req.IntentionItemReqDTO;
import com.college.labselect.dto.req.IntentionSaveReqDTO;
import com.college.labselect.dto.resp.AvailableMentorVO;
import com.college.labselect.dto.resp.IntentionItemVO;
import com.college.labselect.dto.resp.IntentionRespVO;
import com.college.labselect.dto.resp.IntentionSaveRespVO;
import com.college.labselect.entity.Intention;
import com.college.labselect.entity.IntentionItem;
import com.college.labselect.entity.Lab;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.entity.StudentProfile;
import com.college.labselect.entity.SysUser;
import com.college.labselect.entity.UserNotice;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.IntentionItemMapper;
import com.college.labselect.mapper.IntentionMapper;
import com.college.labselect.mapper.LabMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.SelectionRoundMapper;
import com.college.labselect.mapper.StudentProfileMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.mapper.UserNoticeMapper;
import com.college.labselect.service.IIntentionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
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
 * 意向填报服务实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class IntentionServiceImpl implements IIntentionService {

    private static final int STATUS_DRAFT = 1;
    private static final int STATUS_SUBMITTED = 2;
    private static final int ROUND_APPLYING = 2;
    private static final int SUBMIT_FLAG = 1;
    private static final int MAX_ITEMS_FIRST = 3;
    private static final int MAX_ITEMS_SUPPLEMENT = 1;
    private static final int MENTOR_DISABLED = 0;
    private static final int NOTICE_TYPE_INTENTION = 2;
    private static final int STATEMENT_MIN_LENGTH = 300;
    private static final int STATEMENT_MAX_LENGTH = 800;
    private static final int WEEKLY_HOURS_MIN = 1;
    private static final int WEEKLY_HOURS_MAX = 40;

    private final IntentionMapper intentionMapper;
    private final IntentionItemMapper intentionItemMapper;
    private final StudentProfileMapper studentProfileMapper;
    private final MentorProfileMapper mentorProfileMapper;
    private final SysUserMapper sysUserMapper;
    private final LabMapper labMapper;
    private final SelectionRoundMapper selectionRoundMapper;
    private final UserNoticeMapper userNoticeMapper;

    @Override
    public IntentionRespVO getIntention(Long studentUserId, Long roundId) {
        SelectionRound round = resolveRound(roundId);
        if (round == null) {
            return null;
        }
        Intention intention = intentionMapper.selectOne(new LambdaQueryWrapper<Intention>()
                .eq(Intention::getRoundId, round.getId())
                .eq(Intention::getStudentId, studentUserId));
        if (intention == null) {
            return null;
        }
        IntentionRespVO vo = new IntentionRespVO();
        vo.setId(intention.getId());
        vo.setRoundId(round.getId());
        vo.setRoundNo(round.getRoundNo());
        vo.setStatus(intention.getStatus());
        vo.setStatusText(StatusTextUtils.intentionStatus(intention.getStatus()));
        vo.setAcceptInnerAdjust(intention.getAcceptInnerAdjust());
        vo.setAcceptCrossAdjust(intention.getAcceptCrossAdjust());
        vo.setPoolConsent(intention.getPoolConsent());
        vo.setSubmitTime(intention.getSubmitTime());
        vo.setEditable(isEditable(round) ? 1 : 0);
        List<IntentionItem> items = intentionItemMapper.selectList(new LambdaQueryWrapper<IntentionItem>()
                .eq(IntentionItem::getIntentionId, intention.getId())
                .orderByAsc(IntentionItem::getId));
        if (items.isEmpty()) {
            vo.setItems(List.of());
            return vo;
        }
        List<Long> mentorIds = items.stream().map(IntentionItem::getMentorId).distinct().toList();
        Map<Long, MentorProfile> mentorMap = loadMentors(mentorIds);
        Map<Long, SysUser> userMap = loadUsers(mentorMap.values().stream()
                .map(MentorProfile::getUserId).toList());
        Map<Long, Lab> labMap = loadLabs(items.stream().map(IntentionItem::getLabId).distinct().toList());
        List<IntentionItemVO> itemVos = new ArrayList<>();
        for (IntentionItem item : items) {
            MentorProfile mentor = mentorMap.get(item.getMentorId());
            SysUser mentorUser = mentor == null ? null : userMap.get(mentor.getUserId());
            Lab lab = labMap.get(item.getLabId());
            IntentionItemVO itemVo = new IntentionItemVO();
            itemVo.setMentorId(item.getMentorId());
            itemVo.setMentorName(mentorUser == null ? "" : mentorUser.getRealName());
            itemVo.setLabId(item.getLabId());
            itemVo.setLabName(lab == null ? "" : lab.getLabName());
            itemVo.setResearchDirection(mentor == null ? "" : mentor.getResearchDirection());
            itemVo.setRemainQuota(mentor == null ? 0 : remainQuota(mentor));
            itemVos.add(itemVo);
        }
        vo.setItems(itemVos);
        return vo;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public IntentionSaveRespVO saveIntention(Long studentUserId, IntentionSaveReqDTO req) {
        SelectionRound round = requireRound(req.getRoundId());
        ensureApplyWindow(round);
        List<IntentionItemReqDTO> items = Optional.ofNullable(req.getItems()).orElse(List.of());
        boolean submit = Integer.valueOf(SUBMIT_FLAG).equals(req.getSubmit());
        int maxItems = isSupplementRound(round) ? MAX_ITEMS_SUPPLEMENT : MAX_ITEMS_FIRST;
        if (submit && items.isEmpty()) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "至少选择 1 个意向");
        }
        if (items.size() > maxItems) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR,
                    isSupplementRound(round) ? "补录轮最多选择 1 个意向" : "首轮最多选择 3 个意向");
        }
        Set<Long> mentorIds = new HashSet<>();
        for (IntentionItemReqDTO item : items) {
            if (item == null || item.getMentorId() == null || !mentorIds.add(item.getMentorId())) {
                throw new BusinessException(ResultCode.BUSINESS_ERROR, "存在重复的导师意向");
            }
        }
        if (submit) {
            ensureArchiveComplete(studentUserId);
        }
        Map<Long, MentorProfile> mentorMap = new HashMap<>();
        for (Long mentorId : mentorIds) {
            MentorProfile mentor = mentorProfileMapper.selectById(mentorId);
            if (mentor == null || Integer.valueOf(MENTOR_DISABLED).equals(mentor.getStatus())) {
                throw new BusinessException(ResultCode.BUSINESS_ERROR, "存在不可选的导师意向");
            }
            if (remainQuota(mentor) <= 0) {
                throw new BusinessException(ResultCode.BUSINESS_ERROR, "所选导师名额已满");
            }
            mentorMap.put(mentorId, mentor);
        }

        Intention existing = intentionMapper.selectOne(new LambdaQueryWrapper<Intention>()
                .eq(Intention::getRoundId, round.getId())
                .eq(Intention::getStudentId, studentUserId));
        boolean submittedBefore = existing != null
                && Integer.valueOf(STATUS_SUBMITTED).equals(existing.getStatus());
        Intention intention = existing == null ? new Intention() : existing;
        intention.setRoundId(round.getId());
        intention.setStudentId(studentUserId);
        intention.setAcceptInnerAdjust(req.getAcceptInnerAdjust());
        intention.setAcceptCrossAdjust(req.getAcceptCrossAdjust());
        intention.setPoolConsent(req.getPoolConsent());
        intention.setStatus(submit || submittedBefore ? STATUS_SUBMITTED : STATUS_DRAFT);
        if (submit && intention.getSubmitTime() == null) {
            intention.setSubmitTime(LocalDateTime.now());
        }
        if (existing == null) {
            intentionMapper.insert(intention);
        } else {
            intentionMapper.updateById(intention);
        }
        intentionItemMapper.delete(new LambdaQueryWrapper<IntentionItem>()
                .eq(IntentionItem::getIntentionId, intention.getId()));
        for (IntentionItemReqDTO item : items) {
            MentorProfile mentor = mentorMap.get(item.getMentorId());
            IntentionItem record = new IntentionItem();
            record.setIntentionId(intention.getId());
            record.setMentorId(mentor.getId());
            record.setLabId(mentor.getLabId());
            intentionItemMapper.insert(record);
        }
        if (submit && !submittedBefore) {
            sendSubmitNotice(studentUserId, round, intention.getId(), items.size());
        }
        log.info("保存意向填报，studentId={}，roundId={}，count={}，submit={}",
                studentUserId, round.getId(), items.size(), req.getSubmit());
        return new IntentionSaveRespVO(intention.getId(), intention.getStatus());
    }

    @Override
    public PageResult<AvailableMentorVO> pageAvailableMentors(String keyword, Long labId,
                                                               Integer onlyAvailable, long pageNum, long pageSize) {
        long safePage = Math.max(1, pageNum);
        long safeSize = pageSize < 1 ? 10 : Math.min(pageSize, 100);
        List<MentorProfile> mentors = mentorProfileMapper.selectList(new LambdaQueryWrapper<MentorProfile>()
                .eq(MentorProfile::getStatus, 1)
                .eq(labId != null, MentorProfile::getLabId, labId)
                .orderByAsc(MentorProfile::getId));
        Map<Long, SysUser> userMap = loadUsers(mentors.stream().map(MentorProfile::getUserId).toList());
        Map<Long, Lab> labMap = loadLabs(mentors.stream().map(MentorProfile::getLabId).distinct().toList());
        String text = StrUtil.trim(keyword);
        List<AvailableMentorVO> all = new ArrayList<>();
        for (MentorProfile mentor : mentors) {
            SysUser mentorUser = userMap.get(mentor.getUserId());
            Lab lab = labMap.get(mentor.getLabId());
            int remain = remainQuota(mentor);
            if (Integer.valueOf(1).equals(onlyAvailable) && remain <= 0) {
                continue;
            }
            if (StrUtil.isNotBlank(text)
                    && !StrUtil.containsIgnoreCase(mentorUser == null ? "" : mentorUser.getRealName(), text)
                    && !StrUtil.containsIgnoreCase(mentor.getResearchDirection(), text)) {
                continue;
            }
            AvailableMentorVO vo = new AvailableMentorVO();
            vo.setMentorId(mentor.getId());
            vo.setMentorName(mentorUser == null ? "" : mentorUser.getRealName());
            vo.setTitle(mentorUser == null ? "" : mentorUser.getTitle());
            vo.setLabId(mentor.getLabId());
            vo.setLabName(lab == null ? "" : lab.getLabName());
            vo.setResearchDirection(mentor.getResearchDirection());
            vo.setQuota(Optional.ofNullable(mentor.getQuota()).orElse(0));
            vo.setQuotaUsed(Optional.ofNullable(mentor.getQuotaUsed()).orElse(0));
            vo.setRemainQuota(remain);
            vo.setSelectable(remain > 0 ? 1 : 0);
            all.add(vo);
        }
        int from = (int) Math.min((safePage - 1) * safeSize, all.size());
        int to = (int) Math.min(from + safeSize, all.size());
        return new PageResult<>((long) all.size(), safePage, safeSize, new ArrayList<>(all.subList(from, to)));
    }

    /**
     * 查询轮次，不存在则返回 404001。
     *
     * @param roundId 轮次 ID
     * @return 选拔轮次
     */
    private SelectionRound requireRound(Long roundId) {
        SelectionRound round = selectionRoundMapper.selectById(roundId);
        if (round == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "选拔轮次不存在");
        }
        return round;
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
     * 校验填报轮次状态与时间窗。
     *
     * @param round 选拔轮次
     */
    private void ensureApplyWindow(SelectionRound round) {
        LocalDateTime now = LocalDateTime.now();
        if (!Integer.valueOf(ROUND_APPLYING).equals(round.getStatus())
                || round.getApplyStart() == null || round.getApplyEnd() == null
                || now.isBefore(round.getApplyStart()) || now.isAfter(round.getApplyEnd())) {
            throw new BusinessException(ResultCode.OUT_OF_TIME_WINDOW, "当前不在填报时间窗内");
        }
    }

    /**
     * 判断当前是否可编辑填报。
     *
     * @param round 选拔轮次
     * @return 是否可编辑
     */
    private boolean isEditable(SelectionRound round) {
        LocalDateTime now = LocalDateTime.now();
        return Integer.valueOf(ROUND_APPLYING).equals(round.getStatus())
                && round.getApplyStart() != null && round.getApplyEnd() != null
                && !now.isBefore(round.getApplyStart()) && !now.isAfter(round.getApplyEnd());
    }

    /**
     * 校验提交时的档案必填项。
     *
     * @param studentUserId 学生用户 ID
     */
    private void ensureArchiveComplete(Long studentUserId) {
        StudentProfile profile = studentProfileMapper.selectOne(new LambdaQueryWrapper<StudentProfile>()
                .eq(StudentProfile::getUserId, studentUserId));
        List<String> missing = new ArrayList<>();
        if (profile == null) {
            missing.addAll(List.of("编程语言", "项目经历", "每周可投入小时", "可投入时段", "个人陈述"));
        } else {
            if (StrUtil.isBlank(profile.getProgrammingLanguages())) {
                missing.add("编程语言");
            }
            if (StrUtil.isBlank(profile.getProjectExperience())) {
                missing.add("项目经历");
            }
            if (profile.getWeeklyHours() == null
                    || profile.getWeeklyHours() < WEEKLY_HOURS_MIN
                    || profile.getWeeklyHours() > WEEKLY_HOURS_MAX) {
                missing.add("每周可投入小时");
            }
            if (StrUtil.isBlank(profile.getAvailableSlots())) {
                missing.add("可投入时段");
            }
            String statement = profile.getStatement();
            if (StrUtil.isBlank(statement) || statement.length() < STATEMENT_MIN_LENGTH
                    || statement.length() > STATEMENT_MAX_LENGTH) {
                missing.add("个人陈述");
            }
        }
        if (!missing.isEmpty()) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR,
                    "档案必填项未完成：" + String.join("、", missing));
        }
    }

    /**
     * 写入填报提交通知，唯一键冲突时忽略。
     *
     * @param studentUserId 学生用户 ID
     * @param round         选拔轮次
     * @param intentionId   填报 ID
     * @param itemCount     意向数量
     */
    private void sendSubmitNotice(Long studentUserId, SelectionRound round, Long intentionId, int itemCount) {
        UserNotice notice = new UserNotice();
        notice.setUserId(studentUserId);
        notice.setTitle("第 " + Optional.ofNullable(round.getRoundNo()).orElse(0) + " 轮意向已提交");
        notice.setContent("本轮共提交 " + itemCount + " 个意向，填报截止时间：" + round.getApplyEnd());
        notice.setNoticeType(NOTICE_TYPE_INTENTION);
        notice.setBizType("INTENTION");
        notice.setBizId(intentionId);
        notice.setIsRead(0);
        try {
            userNoticeMapper.insert(notice);
        } catch (DuplicateKeyException exception) {
            log.info("填报通知已存在，忽略重复写入，intentionId={}", intentionId);
        }
    }

    /**
     * 计算导师剩余名额。
     *
     * @param mentor 导师档案
     * @return 剩余名额
     */
    private int remainQuota(MentorProfile mentor) {
        int quota = Optional.ofNullable(mentor.getQuota()).orElse(0);
        int used = Optional.ofNullable(mentor.getQuotaUsed()).orElse(0);
        return Math.max(0, quota - used);
    }

    /**
     * 判断是否为补录轮次。
     *
     * @param round 选拔轮次
     * @return 是否补录轮
     */
    private boolean isSupplementRound(SelectionRound round) {
        return round.getRoundNo() != null && round.getRoundNo() > 1;
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
