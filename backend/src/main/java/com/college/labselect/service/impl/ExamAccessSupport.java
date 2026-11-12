package com.college.labselect.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.college.labselect.common.ResultCode;
import com.college.labselect.entity.ExamAnswer;
import com.college.labselect.entity.ExamPaper;
import com.college.labselect.entity.Intention;
import com.college.labselect.entity.IntentionItem;
import com.college.labselect.entity.Lab;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.entity.SysUser;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.ExamAnswerMapper;
import com.college.labselect.mapper.ExamPaperMapper;
import com.college.labselect.mapper.IntentionItemMapper;
import com.college.labselect.mapper.IntentionMapper;
import com.college.labselect.mapper.LabMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.SysUserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 在线笔试访问校验与基础信息加载。
 */
@Component
@RequiredArgsConstructor
public class ExamAccessSupport {

    private static final int INTENTION_SUBMITTED = 2;

    private final ExamPaperMapper examPaperMapper;
    private final ExamAnswerMapper examAnswerMapper;
    private final IntentionMapper intentionMapper;
    private final IntentionItemMapper intentionItemMapper;
    private final MentorProfileMapper mentorProfileMapper;
    private final SysUserMapper sysUserMapper;
    private final LabMapper labMapper;
    private final ExamSupport examSupport;

    /**
     * 查询已发布试卷。
     *
     * @param paperId 试卷 ID
     * @return 试卷
     */
    public ExamPaper requirePublishedPaper(Long paperId) {
        ExamPaper paper = examPaperMapper.selectById(paperId);
        if (paper == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "试卷不存在");
        }
        if (!Integer.valueOf(ExamSupport.PAPER_PUBLISHED).equals(paper.getStatus())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "试卷未发布");
        }
        return paper;
    }

    /**
     * 查询学生答卷。
     *
     * @param paperId       试卷 ID
     * @param studentUserId 学生用户 ID
     * @return 答卷，不存在返回 null
     */
    public ExamAnswer findAnswer(Long paperId, Long studentUserId) {
        return examAnswerMapper.selectOne(new LambdaQueryWrapper<ExamAnswer>()
                .eq(ExamAnswer::getPaperId, paperId)
                .eq(ExamAnswer::getStudentId, studentUserId));
    }

    /**
     * 查询学生答卷，不存在时提示先开始答题。
     *
     * @param paperId       试卷 ID
     * @param studentUserId 学生用户 ID
     * @return 答卷
     */
    public ExamAnswer requireAnswer(Long paperId, Long studentUserId) {
        ExamAnswer answer = findAnswer(paperId, studentUserId);
        if (answer == null) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "请先开始答题");
        }
        return answer;
    }

    /**
     * 校验学生是否选择了该导师。
     *
     * @param paper         试卷
     * @param studentUserId 学生用户 ID
     */
    public void ensureEligible(ExamPaper paper, Long studentUserId) {
        Intention intention = intentionMapper.selectOne(new LambdaQueryWrapper<Intention>()
                .eq(Intention::getRoundId, paper.getRoundId())
                .eq(Intention::getStudentId, studentUserId)
                .eq(Intention::getStatus, INTENTION_SUBMITTED));
        if (intention == null) {
            throw new BusinessException(ResultCode.FORBIDDEN, "本轮未提交意向填报，无法参加笔试");
        }
        Long count = intentionItemMapper.selectCount(new LambdaQueryWrapper<IntentionItem>()
                .eq(IntentionItem::getIntentionId, intention.getId())
                .eq(IntentionItem::getMentorId, paper.getMentorId()));
        if (count == null || count == 0) {
            throw new BusinessException(ResultCode.FORBIDDEN, "未选择该导师，无法参加本场笔试");
        }
    }

    /**
     * 校验批次未锁定。
     *
     * @param paper 试卷
     */
    public void ensureWritable(ExamPaper paper) {
        SelectionRound round = examSupport.requireRound(paper.getRoundId());
        examSupport.ensureWritable(round);
    }

    /**
     * 判断试卷所属轮次是否已锁定。
     *
     * @param paper 试卷
     * @return 是否锁定
     */
    public boolean isLocked(ExamPaper paper) {
        SelectionRound round = examSupport.findRound(paper.getRoundId());
        return round != null && Integer.valueOf(ExamSupport.LOCKED).equals(round.getLocked());
    }

    /**
     * 计算试卷时间状态文案。
     *
     * @param paper 试卷
     * @param now   当前时间
     * @return 时间状态文案
     */
    public String paperTimeText(ExamPaper paper, LocalDateTime now) {
        if (now.isBefore(paper.getStartTime())) {
            return "未开始";
        }
        if (now.isAfter(paper.getEndTime())) {
            return "已结束";
        }
        return "进行中";
    }

    /**
     * 批量加载导师姓名。
     *
     * @param mentorIds 导师档案 ID 集合
     * @return 姓名映射
     */
    public Map<Long, String> loadMentorNames(Set<Long> mentorIds) {
        if (mentorIds.isEmpty()) {
            return new HashMap<>();
        }
        Map<Long, MentorProfile> mentors = mentorProfileMapper.selectBatchIds(mentorIds).stream()
                .collect(Collectors.toMap(MentorProfile::getId, Function.identity(), (first, second) -> first));
        Set<Long> userIds = mentors.values().stream()
                .map(MentorProfile::getUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, SysUser> users = userIds.isEmpty() ? Map.of() : sysUserMapper.selectBatchIds(userIds).stream()
                .collect(Collectors.toMap(SysUser::getId, Function.identity(), (first, second) -> first));
        Map<Long, String> result = new HashMap<>();
        mentors.forEach((mentorId, mentor) -> {
            SysUser user = users.get(mentor.getUserId());
            result.put(mentorId, user == null ? "" : StrUtil.nullToEmpty(user.getRealName()));
        });
        return result;
    }

    /**
     * 批量加载实训室名称。
     *
     * @param labIds 实训室 ID 集合
     * @return 名称映射
     */
    public Map<Long, String> loadLabNames(Set<Long> labIds) {
        if (labIds.isEmpty()) {
            return new HashMap<>();
        }
        return labMapper.selectBatchIds(labIds).stream()
                .collect(Collectors.toMap(Lab::getId, lab -> StrUtil.nullToEmpty(lab.getLabName()),
                        (first, second) -> first));
    }
}
