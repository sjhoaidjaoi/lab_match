package com.college.labselect.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.college.labselect.common.PageResult;
import com.college.labselect.common.StatusTextUtils;
import com.college.labselect.dto.resp.ExamPaperDetailVO;
import com.college.labselect.dto.resp.ExamPaperListVO;
import com.college.labselect.dto.resp.ExamPaperQuestionVO;
import com.college.labselect.entity.ExamAnswer;
import com.college.labselect.entity.ExamPaper;
import com.college.labselect.entity.ExamPaperQuestion;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.Question;
import com.college.labselect.mapper.ExamAnswerMapper;
import com.college.labselect.mapper.ExamPaperMapper;
import com.college.labselect.mapper.ExamPaperQuestionMapper;
import com.college.labselect.mapper.QuestionMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 导师在线试卷查询支撑。
 */
@Component
@RequiredArgsConstructor
public class ExamPaperQuerySupport {

    private final ExamPaperMapper examPaperMapper;
    private final ExamPaperQuestionMapper examPaperQuestionMapper;
    private final QuestionMapper questionMapper;
    private final ExamAnswerMapper examAnswerMapper;
    private final ExamSupport examSupport;

    /**
     * 分页查询导师本人试卷。
     *
     * @param teacherUserId 教师用户 ID
     * @param roundId       轮次 ID，可为空
     * @param keyword       标题关键词，可为空
     * @param status        状态，可为空
     * @param pageNum       页码
     * @param pageSize      每页条数
     * @return 分页结果
     */
    public PageResult<ExamPaperListVO> pagePapers(Long teacherUserId, Long roundId, String keyword,
                                                  Integer status, long pageNum, long pageSize) {
        MentorProfile mentor = examSupport.requireMentor(teacherUserId);
        long safePage = Math.max(1, pageNum);
        long safeSize = pageSize < 1 ? 10 : Math.min(pageSize, 100);
        LambdaQueryWrapper<ExamPaper> wrapper = new LambdaQueryWrapper<ExamPaper>()
                .eq(ExamPaper::getMentorId, mentor.getId())
                .eq(roundId != null, ExamPaper::getRoundId, roundId)
                .eq(status != null, ExamPaper::getStatus, status)
                .like(StrUtil.isNotBlank(keyword), ExamPaper::getTitle, StrUtil.trim(keyword))
                .orderByDesc(ExamPaper::getId);
        Page<ExamPaper> page = examPaperMapper.selectPage(new Page<>(safePage, safeSize), wrapper);
        List<ExamPaper> papers = page.getRecords();
        if (papers.isEmpty()) {
            return new PageResult<>(page.getTotal(), safePage, safeSize, List.of());
        }
        List<Long> paperIds = papers.stream().map(ExamPaper::getId).toList();
        Map<Long, Long> questionCounts = examPaperQuestionMapper.selectList(
                        new LambdaQueryWrapper<ExamPaperQuestion>().in(ExamPaperQuestion::getPaperId, paperIds))
                .stream()
                .collect(Collectors.groupingBy(ExamPaperQuestion::getPaperId, Collectors.counting()));
        Map<Long, List<ExamAnswer>> answerMap = examAnswerMapper.selectList(
                        new LambdaQueryWrapper<ExamAnswer>().in(ExamAnswer::getPaperId, paperIds))
                .stream()
                .collect(Collectors.groupingBy(ExamAnswer::getPaperId));
        List<ExamPaperListVO> list = papers.stream()
                .map(paper -> toListVO(paper, questionCounts.getOrDefault(paper.getId(), 0L),
                        answerMap.getOrDefault(paper.getId(), List.of())))
                .toList();
        return new PageResult<>(page.getTotal(), safePage, safeSize, new ArrayList<>(list));
    }

    /**
     * 构建试卷详情。
     *
     * @param paper 试卷实体
     * @return 试卷详情
     */
    public ExamPaperDetailVO buildDetail(ExamPaper paper) {
        List<ExamPaperQuestion> relations = examPaperQuestionMapper.selectList(
                new LambdaQueryWrapper<ExamPaperQuestion>()
                        .eq(ExamPaperQuestion::getPaperId, paper.getId())
                        .orderByAsc(ExamPaperQuestion::getQuestionNo));
        List<Long> questionIds = relations.stream().map(ExamPaperQuestion::getQuestionId).toList();
        Map<Long, Question> questionMap = questionIds.isEmpty() ? Map.of()
                : questionMapper.selectBatchIds(questionIds).stream()
                .collect(Collectors.toMap(Question::getId, Function.identity(), (first, second) -> first));
        List<ExamPaperQuestionVO> questions = new ArrayList<>();
        for (ExamPaperQuestion relation : relations) {
            Question question = questionMap.get(relation.getQuestionId());
            if (question == null) {
                continue;
            }
            ExamPaperQuestionVO vo = new ExamPaperQuestionVO();
            vo.setId(relation.getId());
            vo.setQuestionId(question.getId());
            vo.setQuestionNo(relation.getQuestionNo());
            vo.setQuestionType(question.getQuestionType());
            vo.setQuestionTypeText(StatusTextUtils.questionType(question.getQuestionType()));
            vo.setContent(question.getContent());
            vo.setOptions(examSupport.parseOptions(question.getOptionsJson()));
            vo.setCorrectAnswer(question.getCorrectAnswer());
            vo.setScore(relation.getScore());
            questions.add(vo);
        }
        ExamPaperDetailVO detail = new ExamPaperDetailVO();
        detail.setId(paper.getId());
        detail.setRoundId(paper.getRoundId());
        detail.setTitle(paper.getTitle());
        detail.setDescription(paper.getDescription());
        detail.setStartTime(paper.getStartTime());
        detail.setEndTime(paper.getEndTime());
        detail.setDurationMinutes(paper.getDurationMinutes());
        detail.setTotalScore(paper.getTotalScore());
        detail.setStatus(paper.getStatus());
        detail.setStatusText(StatusTextUtils.examPaperStatus(paper.getStatus()));
        detail.setQuestionCount(questions.size());
        detail.setQuestions(questions);
        return detail;
    }

    /**
     * 试卷实体转列表项。
     *
     * @param paper       试卷
     * @param questionCnt 题目数
     * @param answers     答卷列表
     * @return 列表项
     */
    private ExamPaperListVO toListVO(ExamPaper paper, Long questionCnt, List<ExamAnswer> answers) {
        ExamPaperListVO vo = new ExamPaperListVO();
        vo.setId(paper.getId());
        vo.setRoundId(paper.getRoundId());
        vo.setTitle(paper.getTitle());
        vo.setStatus(paper.getStatus());
        vo.setStatusText(StatusTextUtils.examPaperStatus(paper.getStatus()));
        vo.setQuestionCount(questionCnt.intValue());
        vo.setTotalScore(paper.getTotalScore());
        vo.setStartTime(paper.getStartTime());
        vo.setEndTime(paper.getEndTime());
        vo.setDurationMinutes(paper.getDurationMinutes());
        vo.setAnswerCount((long) answers.size());
        List<ExamAnswer> submitted = answers.stream()
                .filter(answer -> Integer.valueOf(ExamSupport.ANSWER_SUBMITTED).equals(answer.getStatus()))
                .toList();
        vo.setSubmittedCount((long) submitted.size());
        if (!submitted.isEmpty()) {
            BigDecimal sum = submitted.stream()
                    .map(ExamAnswer::getTotalScore)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            vo.setAverageScore(sum.divide(BigDecimal.valueOf(submitted.size()), 2, RoundingMode.HALF_UP));
        }
        return vo;
    }
}
