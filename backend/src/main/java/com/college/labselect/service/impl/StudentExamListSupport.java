package com.college.labselect.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.college.labselect.common.StatusTextUtils;
import com.college.labselect.dto.resp.StudentExamListVO;
import com.college.labselect.entity.ExamAnswer;
import com.college.labselect.entity.ExamPaper;
import com.college.labselect.entity.Intention;
import com.college.labselect.entity.IntentionItem;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.mapper.ExamAnswerMapper;
import com.college.labselect.mapper.ExamPaperMapper;
import com.college.labselect.mapper.IntentionItemMapper;
import com.college.labselect.mapper.IntentionMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 学生在线笔试列表查询支撑。
 */
@Component
@RequiredArgsConstructor
public class StudentExamListSupport {

    private static final int INTENTION_SUBMITTED = 2;

    private final ExamPaperMapper examPaperMapper;
    private final ExamAnswerMapper examAnswerMapper;
    private final IntentionMapper intentionMapper;
    private final IntentionItemMapper intentionItemMapper;
    private final ExamSupport examSupport;
    private final ExamAccessSupport accessSupport;

    /**
     * 查询学生本人可参加的在线笔试。
     *
     * @param studentUserId 学生用户 ID
     * @param roundId       轮次 ID，可为空
     * @return 试卷列表
     */
    public List<StudentExamListVO> listStudentExams(Long studentUserId, Long roundId) {
        SelectionRound round = examSupport.findRound(roundId);
        if (round == null) {
            return List.of();
        }
        Intention intention = intentionMapper.selectOne(new LambdaQueryWrapper<Intention>()
                .eq(Intention::getRoundId, round.getId())
                .eq(Intention::getStudentId, studentUserId)
                .eq(Intention::getStatus, INTENTION_SUBMITTED));
        if (intention == null) {
            return List.of();
        }
        Set<Long> mentorIds = intentionItemMapper.selectList(new LambdaQueryWrapper<IntentionItem>()
                        .eq(IntentionItem::getIntentionId, intention.getId()))
                .stream()
                .map(IntentionItem::getMentorId)
                .collect(Collectors.toSet());
        if (mentorIds.isEmpty()) {
            return List.of();
        }
        List<ExamPaper> papers = examPaperMapper.selectList(new LambdaQueryWrapper<ExamPaper>()
                .eq(ExamPaper::getRoundId, round.getId())
                .in(ExamPaper::getMentorId, mentorIds)
                .eq(ExamPaper::getStatus, ExamSupport.PAPER_PUBLISHED)
                .orderByAsc(ExamPaper::getStartTime));
        if (papers.isEmpty()) {
            return List.of();
        }
        List<Long> paperIds = papers.stream().map(ExamPaper::getId).toList();
        Map<Long, ExamAnswer> answerMap = examAnswerMapper.selectList(new LambdaQueryWrapper<ExamAnswer>()
                        .eq(ExamAnswer::getStudentId, studentUserId)
                        .in(ExamAnswer::getPaperId, paperIds))
                .stream()
                .collect(Collectors.toMap(ExamAnswer::getPaperId, Function.identity(), (first, second) -> first));
        Map<Long, String> mentorNames = accessSupport.loadMentorNames(mentorIds);
        Map<Long, String> labNames = accessSupport.loadLabNames(papers.stream()
                .map(ExamPaper::getLabId).collect(Collectors.toSet()));
        LocalDateTime now = LocalDateTime.now();
        List<StudentExamListVO> result = new ArrayList<>();
        for (ExamPaper paper : papers) {
            ExamAnswer answer = answerMap.get(paper.getId());
            int answerStatus = answer == null ? 0 : answer.getStatus();
            StudentExamListVO vo = new StudentExamListVO();
            vo.setPaperId(paper.getId());
            vo.setTitle(paper.getTitle());
            vo.setMentorId(paper.getMentorId());
            vo.setMentorName(mentorNames.getOrDefault(paper.getMentorId(), ""));
            vo.setLabName(labNames.getOrDefault(paper.getLabId(), ""));
            vo.setStartTime(paper.getStartTime());
            vo.setEndTime(paper.getEndTime());
            vo.setDurationMinutes(paper.getDurationMinutes());
            vo.setTotalScore(paper.getTotalScore());
            vo.setPaperStatusText(accessSupport.paperTimeText(paper, now));
            vo.setAnswerStatus(answerStatus);
            vo.setAnswerStatusText(StatusTextUtils.examAnswerStatus(answerStatus));
            vo.setMyScore(Integer.valueOf(ExamSupport.ANSWER_SUBMITTED).equals(answerStatus)
                    ? answer.getTotalScore() : null);
            boolean inWindow = !now.isBefore(paper.getStartTime()) && !now.isAfter(paper.getEndTime());
            vo.setCanStart(inWindow && !Integer.valueOf(ExamSupport.ANSWER_SUBMITTED).equals(answerStatus));
            result.add(vo);
        }
        result.sort(Comparator.comparing(StudentExamListVO::getStartTime,
                Comparator.nullsLast(Comparator.naturalOrder())));
        return result;
    }
}
