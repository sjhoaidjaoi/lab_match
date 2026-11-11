package com.college.labselect.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.college.labselect.common.DesensitizeUtils;
import com.college.labselect.common.ResultCode;
import com.college.labselect.common.StatusTextUtils;
import com.college.labselect.dto.req.NominationSaveReqDTO;
import com.college.labselect.dto.resp.NominationItemVO;
import com.college.labselect.dto.resp.NominationSaveRespVO;
import com.college.labselect.entity.Intention;
import com.college.labselect.entity.IntentionItem;
import com.college.labselect.entity.InterviewScore;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.Nomination;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.entity.SysUser;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.IntentionItemMapper;
import com.college.labselect.mapper.IntentionMapper;
import com.college.labselect.mapper.InterviewScoreMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.NominationMapper;
import com.college.labselect.mapper.SelectionRoundMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.service.INominationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
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
 * 拟录取服务实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NominationServiceImpl implements INominationService {

    private static final int STATUS_DRAFT = 1;
    private static final int STATUS_SUBMITTED = 2;
    private static final int INTENTION_SUBMITTED = 2;
    private static final int LOCKED = 1;
    private static final int SUBMIT_FLAG = 1;

    private final NominationMapper nominationMapper;
    private final MentorProfileMapper mentorProfileMapper;
    private final SelectionRoundMapper selectionRoundMapper;
    private final InterviewScoreMapper interviewScoreMapper;
    private final IntentionMapper intentionMapper;
    private final IntentionItemMapper intentionItemMapper;
    private final SysUserMapper sysUserMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public NominationSaveRespVO saveNomination(Long teacherUserId, NominationSaveReqDTO req) {
        MentorProfile mentor = requireMentor(teacherUserId);
        SelectionRound round = requireRound(req.getRoundId());
        ensureEditable(round);
        List<Long> studentIds = req.getStudentIds().stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (studentIds.isEmpty()) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "学生列表不能为空");
        }

        long submitted = nominationMapper.selectCount(new LambdaQueryWrapper<Nomination>()
                .eq(Nomination::getRoundId, round.getId())
                .eq(Nomination::getMentorId, mentor.getId())
                .eq(Nomination::getStatus, STATUS_SUBMITTED));
        if (submitted > 0) {
            throw new BusinessException(ResultCode.DUPLICATE_SUBMIT, "拟录取名单已提交，不可修改");
        }

        List<Nomination> existing = nominationMapper.selectList(new LambdaQueryWrapper<Nomination>()
                .eq(Nomination::getRoundId, round.getId())
                .eq(Nomination::getMentorId, mentor.getId())
                .eq(Nomination::getStatus, STATUS_DRAFT));
        int delta = studentIds.size() - existing.size();
        int quota = Optional.ofNullable(mentor.getQuota()).orElse(0);
        int quotaUsed = Optional.ofNullable(mentor.getQuotaUsed()).orElse(0);
        if (delta > 0 && quotaUsed + delta > quota) {
            throw new BusinessException(ResultCode.QUOTA_EXCEEDED, "超出个人名额上限（" + quota + " 人）");
        }

        Map<Long, InterviewScore> scoreMap = loadScores(mentor, round.getId(), studentIds);
        validateCandidates(mentor, round.getId(), studentIds);
        adjustQuota(mentor, delta);

        int status = Integer.valueOf(SUBMIT_FLAG).equals(req.getSubmit()) ? STATUS_SUBMITTED : STATUS_DRAFT;
        saveRecords(mentor, round.getId(), studentIds, existing, scoreMap, status);

        int newQuotaUsed = quotaUsed + delta;
        NominationSaveRespVO resp = new NominationSaveRespVO();
        resp.setSubmittedCount(studentIds.size());
        resp.setQuota(quota);
        resp.setQuotaUsed(newQuotaUsed);
        resp.setRemainQuota(Math.max(0, quota - newQuotaUsed));
        log.info("保存拟录取名单，mentorId={}，roundId={}，count={}，submit={}",
                mentor.getId(), round.getId(), studentIds.size(), req.getSubmit());
        return resp;
    }

    @Override
    public List<NominationItemVO> listMyNominations(Long teacherUserId, Long roundId) {
        MentorProfile mentor = requireMentor(teacherUserId);
        SelectionRound round = roundId == null ? currentRound() : selectionRoundMapper.selectById(roundId);
        if (round == null) {
            return List.of();
        }
        List<Nomination> records = nominationMapper.selectList(new LambdaQueryWrapper<Nomination>()
                .eq(Nomination::getRoundId, round.getId())
                .eq(Nomination::getMentorId, mentor.getId())
                .orderByDesc(Nomination::getTotalScore)
                .orderByAsc(Nomination::getId));
        if (records.isEmpty()) {
            return List.of();
        }
        Map<Long, SysUser> userMap = loadUsers(records.stream().map(Nomination::getStudentId).toList());
        return records.stream().map(record -> toItem(record, userMap.get(record.getStudentId()))).toList();
    }

    /**
     * 查询当前导师档案，不存在则拒绝。
     *
     * @param teacherUserId 教师用户 ID
     * @return 导师档案
     */
    private MentorProfile requireMentor(Long teacherUserId) {
        MentorProfile mentor = mentorProfileMapper.selectOne(new LambdaQueryWrapper<MentorProfile>()
                .eq(MentorProfile::getUserId, teacherUserId));
        if (mentor == null) {
            throw new BusinessException(ResultCode.FORBIDDEN, "仅导师可操作拟录取名单");
        }
        return mentor;
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
     * 校验批次锁定与名单提交时间窗。
     *
     * @param round 选拔轮次
     */
    private void ensureEditable(SelectionRound round) {
        if (Integer.valueOf(LOCKED).equals(round.getLocked())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "批次已锁定，不可修改拟录取名单");
        }
        LocalDateTime now = LocalDateTime.now();
        if (round.getNominationStart() == null || round.getNominationSubmitEnd() == null
                || now.isBefore(round.getNominationStart()) || now.isAfter(round.getNominationSubmitEnd())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "当前不在拟录取时间窗内");
        }
    }

    /**
     * 批量加载学生面试评分。
     *
     * @param mentor     导师档案
     * @param roundId    轮次 ID
     * @param studentIds 学生 ID 列表
     * @return 学生 ID 到评分的映射
     */
    private Map<Long, InterviewScore> loadScores(MentorProfile mentor, Long roundId, List<Long> studentIds) {
        List<InterviewScore> scores = interviewScoreMapper.selectList(new LambdaQueryWrapper<InterviewScore>()
                .eq(InterviewScore::getRoundId, roundId)
                .eq(InterviewScore::getLabId, mentor.getLabId())
                .in(InterviewScore::getStudentId, studentIds));
        Map<Long, InterviewScore> scoreMap = scores.stream().collect(Collectors.toMap(
                InterviewScore::getStudentId, Function.identity(), (first, second) -> first));
        if (scoreMap.size() < studentIds.size()) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "存在未录入面试评分的学生，不可列入拟录取");
        }
        return scoreMap;
    }

    /**
     * 校验勾选学生均已提交意向且选择了当前导师。
     *
     * @param mentor     导师档案
     * @param roundId    轮次 ID
     * @param studentIds 学生 ID 列表
     */
    private void validateCandidates(MentorProfile mentor, Long roundId, List<Long> studentIds) {
        List<Intention> intentions = intentionMapper.selectList(new LambdaQueryWrapper<Intention>()
                .eq(Intention::getRoundId, roundId)
                .eq(Intention::getStatus, INTENTION_SUBMITTED)
                .in(Intention::getStudentId, studentIds));
        Set<Long> intendedStudentIds = intentions.stream()
                .map(Intention::getStudentId)
                .collect(Collectors.toSet());
        if (!intendedStudentIds.containsAll(studentIds)) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "存在未提交意向的学生，不可列入拟录取");
        }
        List<Long> intentionIds = intentions.stream().map(Intention::getId).toList();
        Long matched = intentionItemMapper.selectCount(new LambdaQueryWrapper<IntentionItem>()
                .in(IntentionItem::getIntentionId, intentionIds)
                .eq(IntentionItem::getMentorId, mentor.getId()));
        if (matched == null || matched < studentIds.size()) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "存在未选择本人的意向学生，不可列入拟录取");
        }
    }

    /**
     * 按差额条件更新导师名额占用。
     *
     * @param mentor 导师档案
     * @param delta  名额变化量，正数占用、负数释放
     */
    private void adjustQuota(MentorProfile mentor, int delta) {
        if (delta > 0) {
            int updated = mentorProfileMapper.increaseQuotaUsed(mentor.getId(), delta);
            if (updated == 0) {
                throw new BusinessException(ResultCode.QUOTA_EXCEEDED,
                        "超出个人名额上限（" + Optional.ofNullable(mentor.getQuota()).orElse(0) + " 人）");
            }
        } else if (delta < 0) {
            mentorProfileMapper.decreaseQuotaUsed(mentor.getId(), -delta);
        }
    }

    /**
     * 覆盖保存导师本轮草稿名单。
     *
     * @param mentor     导师档案
     * @param roundId    轮次 ID
     * @param studentIds 本次勾选学生
     * @param existing   原草稿记录
     * @param scoreMap   评分映射
     * @param status     目标状态
     */
    private void saveRecords(MentorProfile mentor, Long roundId, List<Long> studentIds,
                             List<Nomination> existing, Map<Long, InterviewScore> scoreMap, int status) {
        Map<Long, Nomination> existingMap = existing.stream().collect(Collectors.toMap(
                Nomination::getStudentId, Function.identity(), (first, second) -> first));
        Set<Long> selected = new HashSet<>(studentIds);
        List<Long> removeIds = existing.stream()
                .filter(record -> !selected.contains(record.getStudentId()))
                .map(Nomination::getId)
                .toList();
        if (!removeIds.isEmpty()) {
            nominationMapper.deleteBatchIds(removeIds);
        }
        for (Long studentId : studentIds) {
            InterviewScore score = scoreMap.get(studentId);
            Nomination record = existingMap.get(studentId);
            boolean insert = record == null;
            if (insert) {
                record = new Nomination();
            }
            record.setRoundId(roundId);
            record.setLabId(mentor.getLabId());
            record.setMentorId(mentor.getId());
            record.setStudentId(studentId);
            record.setScoreId(score.getId());
            record.setTotalScore(resolveTotalScore(score));
            record.setStatus(status);
            if (insert) {
                nominationMapper.insert(record);
            } else {
                nominationMapper.updateById(record);
            }
        }
    }

    /**
     * 取评分快照，优先手动总分，其次系统总分。
     *
     * @param score 面试评分
     * @return 总分快照
     */
    private BigDecimal resolveTotalScore(InterviewScore score) {
        if (score.getFinalTotal() != null) {
            return score.getFinalTotal();
        }
        if (score.getManualTotal() != null) {
            return score.getManualTotal();
        }
        return Optional.ofNullable(score.getSystemTotal()).orElse(BigDecimal.ZERO);
    }

    /**
     * 批量加载用户。
     *
     * @param userIds 用户 ID 列表
     * @return 用户 ID 到账号的映射
     */
    private Map<Long, SysUser> loadUsers(List<Long> userIds) {
        if (userIds.isEmpty()) {
            return new HashMap<>();
        }
        return sysUserMapper.selectBatchIds(userIds).stream()
                .collect(Collectors.toMap(SysUser::getId, Function.identity(), (first, second) -> first));
    }

    /**
     * 拟录取记录转列表项，学生信息脱敏。
     *
     * @param record 拟录取记录
     * @param user   学生账号
     * @return 列表项
     */
    private NominationItemVO toItem(Nomination record, SysUser user) {
        NominationItemVO vo = new NominationItemVO();
        vo.setId(record.getId());
        vo.setStudentId(record.getStudentId());
        vo.setStudentNo(user == null ? "" : DesensitizeUtils.maskUserNo(user.getUserNo()));
        vo.setStudentName(user == null ? "" : DesensitizeUtils.maskName(user.getRealName()));
        vo.setTotalScore(record.getTotalScore());
        vo.setStatus(record.getStatus());
        vo.setStatusText(StatusTextUtils.nominationStatus(record.getStatus()));
        return vo;
    }
}
