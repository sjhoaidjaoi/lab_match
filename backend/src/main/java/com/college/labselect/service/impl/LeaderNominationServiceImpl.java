package com.college.labselect.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.college.labselect.common.DesensitizeUtils;
import com.college.labselect.common.ResultCode;
import com.college.labselect.common.StatusTextUtils;
import com.college.labselect.dto.resp.LeaderNominationConflictVO;
import com.college.labselect.dto.resp.LeaderNominationMentorVO;
import com.college.labselect.dto.resp.LeaderNominationSubmitRespVO;
import com.college.labselect.dto.resp.LeaderNominationSummaryVO;
import com.college.labselect.entity.Lab;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.Nomination;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.entity.SysUser;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.LabMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.NominationMapper;
import com.college.labselect.mapper.SelectionRoundMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.service.ILeaderNominationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 本室拟录取汇总服务实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LeaderNominationServiceImpl implements ILeaderNominationService {

    private static final int STATUS_DRAFT = 1;
    private static final int STATUS_SUBMITTED = 2;
    private static final int LOCKED = 1;

    private final NominationMapper nominationMapper;
    private final MentorProfileMapper mentorProfileMapper;
    private final SelectionRoundMapper selectionRoundMapper;
    private final LabMapper labMapper;
    private final SysUserMapper sysUserMapper;

    @Override
    public LeaderNominationSummaryVO summary(Long leaderUserId, Long roundId) {
        Lab lab = requireLab(leaderUserId);
        SelectionRound round = resolveRound(roundId);
        if (round == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "当前无选拔轮次");
        }
        List<MentorProfile> mentors = listMentors(lab.getId());
        List<Nomination> nominations = listNominations(round.getId(), lab.getId());
        Map<Long, SysUser> mentorUsers = loadUsers(mentors.stream()
                .map(MentorProfile::getUserId)
                .toList());
        Map<Long, List<Nomination>> byMentor = nominations.stream()
                .collect(Collectors.groupingBy(Nomination::getMentorId));

        List<LeaderNominationMentorVO> rows = new ArrayList<>();
        Map<Long, String> mentorNameMap = new HashMap<>();
        int quotaUsed = 0;
        for (MentorProfile mentor : mentors) {
            SysUser mentorUser = mentorUsers.get(mentor.getUserId());
            String mentorName = mentorUser == null ? "" : mentorUser.getRealName();
            mentorNameMap.put(mentor.getId(), mentorName);
            List<Nomination> mentorNominations = byMentor.getOrDefault(mentor.getId(), List.of());
            long submittedCount = mentorNominations.stream()
                    .filter(item -> Integer.valueOf(STATUS_SUBMITTED).equals(item.getStatus()))
                    .count();
            long draftCount = mentorNominations.stream()
                    .filter(item -> Integer.valueOf(STATUS_DRAFT).equals(item.getStatus()))
                    .count();
            int submitStatus = submittedCount > 0 ? 2 : (draftCount > 0 ? 1 : 0);
            LeaderNominationMentorVO row = new LeaderNominationMentorVO();
            row.setMentorId(mentor.getId());
            row.setMentorName(mentorName);
            row.setQuota(Optional.ofNullable(mentor.getQuota()).orElse(0));
            row.setNominatedCount((int) (submittedCount + draftCount));
            row.setSubmitStatus(submitStatus);
            row.setSubmitStatusText(StatusTextUtils.leaderSubmitStatus(submitStatus));
            rows.add(row);
            quotaUsed += Optional.ofNullable(mentor.getQuotaUsed()).orElse(0);
        }

        List<LeaderNominationConflictVO> conflicts = detectConflicts(nominations, mentorNameMap);
        int labQuota = Optional.ofNullable(lab.getTotalQuota())
                .orElseGet(() -> mentors.stream().mapToInt(item -> Optional.ofNullable(item.getQuota()).orElse(0)).sum());
        LeaderNominationSummaryVO result = new LeaderNominationSummaryVO();
        result.setLabQuota(labQuota);
        result.setQuotaUsed(quotaUsed);
        result.setRemainQuota(Math.max(0, labQuota - quotaUsed));
        result.setConflictCount(conflicts.size());
        result.setMentors(rows);
        result.setConflicts(conflicts);
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public LeaderNominationSubmitRespVO submit(Long leaderUserId, Long roundId) {
        Lab lab = requireLab(leaderUserId);
        SelectionRound round = selectionRoundMapper.selectById(roundId);
        if (round == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "选拔轮次不存在");
        }
        ensureSubmitWindow(round);
        List<Nomination> drafts = nominationMapper.selectList(new LambdaQueryWrapper<Nomination>()
                .eq(Nomination::getRoundId, roundId)
                .eq(Nomination::getLabId, lab.getId())
                .eq(Nomination::getStatus, STATUS_DRAFT));
        for (Nomination draft : drafts) {
            draft.setStatus(STATUS_SUBMITTED);
            nominationMapper.updateById(draft);
        }
        List<Nomination> submissions = listNominations(roundId, lab.getId());
        List<MentorProfile> mentors = listMentors(lab.getId());
        Map<Long, SysUser> mentorUsers = loadUsers(mentors.stream()
                .map(MentorProfile::getUserId)
                .toList());
        Map<Long, String> mentorNameMap = new HashMap<>();
        for (MentorProfile mentor : mentors) {
            SysUser user = mentorUsers.get(mentor.getUserId());
            mentorNameMap.put(mentor.getId(), user == null ? "" : user.getRealName());
        }
        int conflictCount = detectConflicts(submissions, mentorNameMap).size();
        LeaderNominationSubmitRespVO resp = new LeaderNominationSubmitRespVO();
        resp.setAdmissionCount(submissions.size());
        resp.setConflictCount(conflictCount);
        log.info("提交本室拟录取名单，labId={}，roundId={}，count={}，conflict={}",
                lab.getId(), roundId, submissions.size(), conflictCount);
        return resp;
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
            throw new BusinessException(ResultCode.FORBIDDEN, "仅实训室负责人可操作本室名单");
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
     * 查询本室导师。
     *
     * @param labId 实训室 ID
     * @return 导师列表
     */
    private List<MentorProfile> listMentors(Long labId) {
        return mentorProfileMapper.selectList(new LambdaQueryWrapper<MentorProfile>()
                .eq(MentorProfile::getLabId, labId)
                .orderByAsc(MentorProfile::getId));
    }

    /**
     * 查询本室本轮全部拟录取记录（含草稿与已提交），提交状态由调用方按状态区分。
     *
     * @param roundId 轮次 ID
     * @param labId   实训室 ID
     * @return 拟录取列表
     */
    private List<Nomination> listNominations(Long roundId, Long labId) {
        return nominationMapper.selectList(new LambdaQueryWrapper<Nomination>()
                .eq(Nomination::getRoundId, roundId)
                .eq(Nomination::getLabId, labId)
                .orderByAsc(Nomination::getId));
    }

    /**
     * 校验批次锁定与名单提交时间窗。
     *
     * @param round 选拔轮次
     */
    private void ensureSubmitWindow(SelectionRound round) {
        if (Integer.valueOf(LOCKED).equals(round.getLocked())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "批次已锁定，不可提交本室名单");
        }
        LocalDateTime now = LocalDateTime.now();
        if (round.getNominationStart() == null || round.getNominationSubmitEnd() == null
                || now.isBefore(round.getNominationStart()) || now.isAfter(round.getNominationSubmitEnd())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "当前不在名单提交时间窗内");
        }
    }

    /**
     * 检测同一学生被本室多名导师拟录取的冲突。
     *
     * @param nominations   拟录取记录
     * @param mentorNameMap 导师 ID 到姓名的映射
     * @return 冲突列表
     */
    private List<LeaderNominationConflictVO> detectConflicts(List<Nomination> nominations,
                                                             Map<Long, String> mentorNameMap) {
        Map<Long, List<Nomination>> byStudent = nominations.stream()
                .filter(item -> Integer.valueOf(STATUS_SUBMITTED).equals(item.getStatus()))
                .collect(Collectors.groupingBy(Nomination::getStudentId));
        if (byStudent.isEmpty()) {
            return List.of();
        }
        Map<Long, SysUser> students = loadUsers(new ArrayList<>(byStudent.keySet()));
        List<LeaderNominationConflictVO> conflicts = new ArrayList<>();
        for (Map.Entry<Long, List<Nomination>> entry : byStudent.entrySet()) {
            Set<Long> mentorIds = entry.getValue().stream()
                    .map(Nomination::getMentorId)
                    .collect(Collectors.toSet());
            if (mentorIds.size() < 2) {
                continue;
            }
            SysUser student = students.get(entry.getKey());
            LeaderNominationConflictVO conflict = new LeaderNominationConflictVO();
            conflict.setStudentId(entry.getKey());
            conflict.setStudentName(student == null ? "" : DesensitizeUtils.maskName(student.getRealName()));
            conflict.setMentorNames(mentorIds.stream().map(mentorNameMap::get).toList());
            conflict.setReason("同一学生被本室 " + mentorIds.size() + " 名导师拟录取");
            conflicts.add(conflict);
        }
        return conflicts;
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
}
