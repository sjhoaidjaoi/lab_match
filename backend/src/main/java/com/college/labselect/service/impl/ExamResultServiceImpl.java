package com.college.labselect.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.college.labselect.common.DesensitizeUtils;
import com.college.labselect.common.PageResult;
import com.college.labselect.common.ResultCode;
import com.college.labselect.common.StatusTextUtils;
import com.college.labselect.dto.resp.ExamResultVO;
import com.college.labselect.entity.ExamAnswer;
import com.college.labselect.entity.ExamPaper;
import com.college.labselect.entity.Intention;
import com.college.labselect.entity.IntentionItem;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.SysUser;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.ExamAnswerMapper;
import com.college.labselect.mapper.ExamPaperMapper;
import com.college.labselect.mapper.IntentionItemMapper;
import com.college.labselect.mapper.IntentionMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.service.IExamResultService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 导师查看在线笔试结果服务实现。
 */
@Service
@RequiredArgsConstructor
public class ExamResultServiceImpl implements IExamResultService {

    private static final int INTENTION_SUBMITTED = 2;

    private final ExamPaperMapper examPaperMapper;
    private final ExamAnswerMapper examAnswerMapper;
    private final IntentionMapper intentionMapper;
    private final IntentionItemMapper intentionItemMapper;
    private final SysUserMapper sysUserMapper;
    private final ExamSupport examSupport;

    @Override
    public PageResult<ExamResultVO> pageResults(Long teacherUserId, Long paperId, Integer status,
                                                long pageNum, long pageSize) {
        MentorProfile mentor = examSupport.requireMentor(teacherUserId);
        ExamPaper paper = examPaperMapper.selectById(paperId);
        if (paper == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "试卷不存在");
        }
        if (!Objects.equals(mentor.getId(), paper.getMentorId())) {
            throw new BusinessException(ResultCode.FORBIDDEN, "只能查看本人试卷");
        }
        long safePage = Math.max(1, pageNum);
        long safeSize = pageSize < 1 ? 10 : Math.min(pageSize, 100);
        Set<Long> studentIds = eligibleStudentIds(paper);
        if (studentIds.isEmpty()) {
            return new PageResult<>(0L, safePage, safeSize, List.of());
        }
        Map<Long, SysUser> userMap = sysUserMapper.selectBatchIds(studentIds).stream()
                .collect(Collectors.toMap(SysUser::getId, Function.identity(), (first, second) -> first));
        Map<Long, ExamAnswer> answerMap = examAnswerMapper.selectList(new LambdaQueryWrapper<ExamAnswer>()
                        .eq(ExamAnswer::getPaperId, paperId)
                        .in(ExamAnswer::getStudentId, studentIds))
                .stream()
                .collect(Collectors.toMap(ExamAnswer::getStudentId, Function.identity(), (first, second) -> first));
        List<ExamResultVO> rows = new ArrayList<>();
        for (Long studentId : studentIds) {
            SysUser student = userMap.get(studentId);
            ExamAnswer answer = answerMap.get(studentId);
            int answerStatus = answer == null ? 0 : answer.getStatus();
            if (status != null && !Objects.equals(status, answerStatus)) {
                continue;
            }
            ExamResultVO vo = new ExamResultVO();
            vo.setStudentId(studentId);
            vo.setStudentNo(student == null ? "" : DesensitizeUtils.maskUserNo(student.getUserNo()));
            vo.setStudentName(student == null ? "" : DesensitizeUtils.maskName(student.getRealName()));
            vo.setStartTime(answer == null ? null : answer.getStartTime());
            vo.setSubmitTime(answer == null ? null : answer.getSubmitTime());
            vo.setStatus(answerStatus);
            vo.setStatusText(StatusTextUtils.examAnswerStatus(answerStatus));
            vo.setScore(answer == null || !Integer.valueOf(ExamSupport.ANSWER_SUBMITTED)
                    .equals(answerStatus) ? null : answer.getTotalScore());
            rows.add(vo);
        }
        rows.sort(Comparator
                .comparing((ExamResultVO row) -> row.getStatus() != null
                        && row.getStatus() == ExamSupport.ANSWER_SUBMITTED ? 0 : 1)
                .thenComparing(row -> row.getScore() == null ? BigDecimal.ZERO : row.getScore(),
                        Comparator.reverseOrder())
                .thenComparing(ExamResultVO::getStudentId));
        int from = (int) Math.min((safePage - 1) * safeSize, rows.size());
        int to = (int) Math.min(from + safeSize, rows.size());
        return new PageResult<>((long) rows.size(), safePage, safeSize, new ArrayList<>(rows.subList(from, to)));
    }

    /**
     * 查询试卷对应的意向学生集合。
     *
     * @param paper 试卷
     * @return 学生用户 ID 集合
     */
    private Set<Long> eligibleStudentIds(ExamPaper paper) {
        List<Intention> intentions = intentionMapper.selectList(new LambdaQueryWrapper<Intention>()
                .eq(Intention::getRoundId, paper.getRoundId())
                .eq(Intention::getStatus, INTENTION_SUBMITTED));
        if (intentions.isEmpty()) {
            return Set.of();
        }
        Map<Long, Long> intentionStudent = intentions.stream()
                .collect(Collectors.toMap(Intention::getId, Intention::getStudentId, (first, second) -> first));
        return intentionItemMapper.selectList(new LambdaQueryWrapper<IntentionItem>()
                        .in(IntentionItem::getIntentionId, intentionStudent.keySet())
                        .eq(IntentionItem::getMentorId, paper.getMentorId()))
                .stream()
                .map(item -> intentionStudent.get(item.getIntentionId()))
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }
}
