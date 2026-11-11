package com.college.labselect.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.college.labselect.common.DesensitizeUtils;
import com.college.labselect.common.ResultCode;
import com.college.labselect.common.StatusTextUtils;
import com.college.labselect.dto.req.WaitlistRankItemReqDTO;
import com.college.labselect.dto.req.WaitlistRankReqDTO;
import com.college.labselect.dto.resp.WaitlistItemVO;
import com.college.labselect.entity.InterviewScore;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.OperationLog;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.entity.SysUser;
import com.college.labselect.entity.Waitlist;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.InterviewScoreMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.OperationLogMapper;
import com.college.labselect.mapper.SelectionRoundMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.mapper.WaitlistMapper;
import com.college.labselect.service.IWaitlistService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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
 * 递补名单服务实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WaitlistServiceImpl implements IWaitlistService {

    private static final int MANUAL = 1;
    private static final int LOCKED = 1;

    private final WaitlistMapper waitlistMapper;
    private final MentorProfileMapper mentorProfileMapper;
    private final SelectionRoundMapper selectionRoundMapper;
    private final InterviewScoreMapper interviewScoreMapper;
    private final SysUserMapper sysUserMapper;
    private final OperationLogMapper operationLogMapper;

    @Override
    public List<WaitlistItemVO> listWaitlist(Long teacherUserId, Long roundId) {
        MentorProfile mentor = requireMentor(teacherUserId);
        Long targetRoundId = roundId;
        if (targetRoundId == null) {
            SelectionRound current = currentRound();
            if (current == null) {
                return List.of();
            }
            targetRoundId = current.getId();
        }
        List<Waitlist> records = waitlistMapper.selectList(new LambdaQueryWrapper<Waitlist>()
                .eq(Waitlist::getRoundId, targetRoundId)
                .eq(Waitlist::getMentorId, mentor.getId())
                .orderByAsc(Waitlist::getRankNo)
                .orderByAsc(Waitlist::getId));
        if (records.isEmpty()) {
            return List.of();
        }
        Map<Long, SysUser> userMap = loadUsers(records.stream().map(Waitlist::getStudentId).toList());
        Map<Long, InterviewScore> scoreMap = loadScores(targetRoundId, mentor.getLabId(),
                records.stream().map(Waitlist::getStudentId).toList());
        List<WaitlistItemVO> result = new ArrayList<>();
        for (Waitlist record : records) {
            SysUser student = userMap.get(record.getStudentId());
            InterviewScore score = scoreMap.get(record.getStudentId());
            WaitlistItemVO vo = new WaitlistItemVO();
            vo.setId(record.getId());
            vo.setRankNo(record.getRankNo());
            vo.setStudentId(record.getStudentId());
            vo.setStudentNo(student == null ? "" : DesensitizeUtils.maskUserNo(student.getUserNo()));
            vo.setStudentName(student == null ? "" : DesensitizeUtils.maskName(student.getRealName()));
            vo.setTotalScore(score == null ? null : resolveTotalScore(score));
            vo.setIsManual(record.getIsManual());
            vo.setAdjustReason(record.getAdjustReason());
            vo.setApplyStatus(record.getApplyStatus());
            vo.setApplyStatusText(StatusTextUtils.waitlistApplyStatus(record.getApplyStatus()));
            result.add(vo);
        }
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void adjustRank(Long teacherUserId, WaitlistRankReqDTO req) {
        MentorProfile mentor = requireMentor(teacherUserId);
        SelectionRound round = selectionRoundMapper.selectById(req.getRoundId());
        if (round != null && Integer.valueOf(LOCKED).equals(round.getLocked())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "批次已锁定，不可调整递补顺位");
        }
        List<WaitlistRankItemReqDTO> items = req.getItems();
        Set<Integer> newRanks = new HashSet<>();
        for (WaitlistRankItemReqDTO item : items) {
            if (!newRanks.add(item.getRankNo())) {
                throw new BusinessException(ResultCode.BUSINESS_ERROR, "递补顺位重复");
            }
        }

        List<Waitlist> targets = new ArrayList<>();
        for (WaitlistRankItemReqDTO item : items) {
            Waitlist record = waitlistMapper.selectById(item.getWaitlistId());
            if (record == null) {
                throw new BusinessException(ResultCode.NOT_FOUND, "递补记录不存在");
            }
            if (!Objects.equals(record.getMentorId(), mentor.getId())) {
                throw new BusinessException(ResultCode.FORBIDDEN, "无权调整他人的递补记录");
            }
            if (!Objects.equals(record.getRoundId(), req.getRoundId())) {
                throw new BusinessException(ResultCode.BUSINESS_ERROR, "递补记录不属于该轮次");
            }
            targets.add(record);
        }

        Set<Long> adjustedIds = targets.stream().map(Waitlist::getId).collect(Collectors.toSet());
        List<Waitlist> allRecords = waitlistMapper.selectList(new LambdaQueryWrapper<Waitlist>()
                .eq(Waitlist::getRoundId, req.getRoundId())
                .eq(Waitlist::getMentorId, mentor.getId()));
        Set<Integer> occupiedRanks = allRecords.stream()
                .filter(record -> !adjustedIds.contains(record.getId()))
                .map(Waitlist::getRankNo)
                .collect(Collectors.toCollection(HashSet::new));
        for (WaitlistRankItemReqDTO item : items) {
            if (!occupiedRanks.add(item.getRankNo())) {
                throw new BusinessException(ResultCode.BUSINESS_ERROR, "递补顺位重复");
            }
        }

        SysUser operator = sysUserMapper.selectById(teacherUserId);
        String operatorName = operator == null ? "" : operator.getRealName();
        for (int index = 0; index < targets.size(); index++) {
            Waitlist record = targets.get(index);
            int beforeRank = Optional.ofNullable(record.getRankNo()).orElse(0);
            int afterRank = items.get(index).getRankNo();
            record.setRankNo(afterRank);
            record.setIsManual(MANUAL);
            record.setAdjustReason(req.getAdjustReason());
            waitlistMapper.updateById(record);
            writeLog(teacherUserId, operatorName, record.getId(), beforeRank, afterRank, req.getAdjustReason());
        }
        log.info("调整递补顺位，mentorId={}，roundId={}，count={}",
                mentor.getId(), req.getRoundId(), targets.size());
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
            throw new BusinessException(ResultCode.FORBIDDEN, "仅导师可操作递补名单");
        }
        return mentor;
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
     * 批量加载学生面试评分。
     *
     * @param roundId    轮次 ID
     * @param labId      实训室 ID
     * @param studentIds 学生 ID 列表
     * @return 学生 ID 到评分的映射
     */
    private Map<Long, InterviewScore> loadScores(Long roundId, Long labId, List<Long> studentIds) {
        if (roundId == null || labId == null || studentIds.isEmpty()) {
            return new HashMap<>();
        }
        return interviewScoreMapper.selectList(new LambdaQueryWrapper<InterviewScore>()
                        .eq(InterviewScore::getRoundId, roundId)
                        .eq(InterviewScore::getLabId, labId)
                        .in(InterviewScore::getStudentId, studentIds))
                .stream()
                .collect(Collectors.toMap(InterviewScore::getStudentId, Function.identity(),
                        (first, second) -> first));
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
     * 写入顺位调整操作日志。
     *
     * @param operatorId   操作人 ID
     * @param operatorName 操作人姓名
     * @param waitlistId   递补记录 ID
     * @param beforeRank   调整前顺位
     * @param afterRank    调整后顺位
     * @param reason       调整理由
     */
    private void writeLog(Long operatorId, String operatorName, Long waitlistId,
                          int beforeRank, int afterRank, String reason) {
        OperationLog operationLog = new OperationLog();
        operationLog.setOperatorId(operatorId);
        operationLog.setOperatorName(operatorName);
        operationLog.setBizType("WAITLIST");
        operationLog.setBizId(waitlistId);
        operationLog.setAction("调整递补顺位");
        operationLog.setBeforeValue("rankNo=" + beforeRank);
        operationLog.setAfterValue("rankNo=" + afterRank);
        operationLog.setReason(reason);
        operationLogMapper.insert(operationLog);
    }
}
