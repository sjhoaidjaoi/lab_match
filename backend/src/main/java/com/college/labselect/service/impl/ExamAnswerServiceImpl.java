package com.college.labselect.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.ExamAnswerItemReqDTO;
import com.college.labselect.dto.req.ExamAnswerSaveReqDTO;
import com.college.labselect.dto.resp.ExamSaveRespVO;
import com.college.labselect.dto.resp.ExamSubmitRespVO;
import com.college.labselect.dto.resp.StudentExamDetailVO;
import com.college.labselect.dto.resp.StudentExamListVO;
import com.college.labselect.entity.ExamAnswer;
import com.college.labselect.entity.ExamAnswerItem;
import com.college.labselect.entity.ExamPaper;
import com.college.labselect.entity.ExamPaperQuestion;
import com.college.labselect.entity.Question;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.ExamAnswerItemMapper;
import com.college.labselect.mapper.ExamAnswerMapper;
import com.college.labselect.mapper.ExamPaperMapper;
import com.college.labselect.service.IExamAnswerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 学生在线答题服务实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExamAnswerServiceImpl implements IExamAnswerService {

    private static final int MAX_ANSWER_LENGTH = 2000;
    private static final int AUTO_SCAN_LIMIT = 500;

    private final ExamPaperMapper examPaperMapper;
    private final ExamAnswerMapper examAnswerMapper;
    private final ExamAnswerItemMapper examAnswerItemMapper;
    private final ExamSupport examSupport;
    private final ExamAccessSupport accessSupport;
    private final ExamAnswerDetailSupport detailSupport;
    private final StudentExamListSupport listSupport;

    @Override
    public List<StudentExamListVO> listStudentExams(Long studentUserId, Long roundId) {
        return listSupport.listStudentExams(studentUserId, roundId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public StudentExamDetailVO getStudentExam(Long studentUserId, Long paperId) {
        ExamPaper paper = accessSupport.requirePublishedPaper(paperId);
        accessSupport.ensureEligible(paper, studentUserId);
        ExamAnswer answer = accessSupport.findAnswer(paperId, studentUserId);
        LocalDateTime now = LocalDateTime.now();
        if (answer == null) {
            if (now.isBefore(paper.getStartTime())) {
                throw new BusinessException(ResultCode.OUT_OF_TIME_WINDOW, "答题尚未开始");
            }
            if (now.isAfter(paper.getEndTime())) {
                throw new BusinessException(ResultCode.OUT_OF_TIME_WINDOW, "答题已结束");
            }
            return detailSupport.buildDetail(paper, null);
        }
        if (Integer.valueOf(ExamSupport.ANSWER_ONGOING).equals(answer.getStatus())
                && now.isAfter(detailSupport.deadline(paper, answer)) && !accessSupport.isLocked(paper)) {
            submitInternal(answer, paper, now);
            answer = examAnswerMapper.selectById(answer.getId());
        }
        return detailSupport.buildDetail(paper, answer);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public StudentExamDetailVO startExam(Long studentUserId, Long paperId) {
        ExamPaper paper = accessSupport.requirePublishedPaper(paperId);
        accessSupport.ensureEligible(paper, studentUserId);
        accessSupport.ensureWritable(paper);
        LocalDateTime now = LocalDateTime.now();
        ExamAnswer answer = accessSupport.findAnswer(paperId, studentUserId);
        if (answer != null && Integer.valueOf(ExamSupport.ANSWER_ONGOING).equals(answer.getStatus())
                && now.isAfter(detailSupport.deadline(paper, answer))) {
            submitInternal(answer, paper, now);
            answer = examAnswerMapper.selectById(answer.getId());
            return detailSupport.buildDetail(paper, answer);
        }
        if (answer == null) {
            if (now.isBefore(paper.getStartTime()) || now.isAfter(paper.getEndTime())) {
                throw new BusinessException(ResultCode.OUT_OF_TIME_WINDOW, "当前不在答题时间窗内");
            }
            answer = newAnswer(paper, studentUserId, now);
        }
        return detailSupport.buildDetail(paper, answer);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ExamSaveRespVO saveAnswers(Long studentUserId, Long paperId, ExamAnswerSaveReqDTO req) {
        ExamPaper paper = accessSupport.requirePublishedPaper(paperId);
        accessSupport.ensureEligible(paper, studentUserId);
        accessSupport.ensureWritable(paper);
        ExamAnswer answer = accessSupport.requireAnswer(paperId, studentUserId);
        if (Integer.valueOf(ExamSupport.ANSWER_SUBMITTED).equals(answer.getStatus())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "答卷已提交，不可修改");
        }
        LocalDateTime now = LocalDateTime.now();
        if (now.isAfter(detailSupport.deadline(paper, answer))) {
            submitInternal(answer, paper, now);
            ExamSaveRespVO auto = new ExamSaveRespVO();
            auto.setSavedCount(0);
            auto.setAnswerStatus(ExamSupport.ANSWER_SUBMITTED);
            auto.setRemainingSeconds(0L);
            return auto;
        }
        Set<Long> validIds = detailSupport.listRelations(paperId).stream()
                .map(ExamPaperQuestion::getQuestionId)
                .collect(Collectors.toSet());
        Set<Long> seen = new HashSet<>();
        Map<Long, ExamAnswerItem> itemMap = detailSupport.loadItems(answer.getId());
        int saved = 0;
        for (ExamAnswerItemReqDTO item : req.getItems()) {
            if (!validIds.contains(item.getQuestionId())) {
                throw new BusinessException(ResultCode.BUSINESS_ERROR, "题目不属于本试卷");
            }
            if (!seen.add(item.getQuestionId())) {
                throw new BusinessException(ResultCode.PARAM_ERROR, "作答题目重复");
            }
            String content = StrUtil.trim(item.getAnswerContent());
            if (content != null && content.length() > MAX_ANSWER_LENGTH) {
                throw new BusinessException(ResultCode.PARAM_ERROR, "作答内容最长 2000 字");
            }
            ExamAnswerItem entity = itemMap.get(item.getQuestionId());
            boolean create = entity == null;
            if (create) {
                entity = new ExamAnswerItem();
                entity.setAnswerId(answer.getId());
                entity.setQuestionId(item.getQuestionId());
                entity.setIsCorrect(0);
                entity.setScore(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            }
            entity.setAnswerContent(content);
            if (create) {
                examAnswerItemMapper.insert(entity);
            } else {
                examAnswerItemMapper.updateById(entity);
            }
            saved++;
        }
        ExamSaveRespVO resp = new ExamSaveRespVO();
        resp.setSavedCount(saved);
        resp.setAnswerStatus(answer.getStatus());
        resp.setRemainingSeconds(detailSupport.remainingSeconds(paper, answer));
        return resp;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ExamSubmitRespVO submitExam(Long studentUserId, Long paperId) {
        ExamPaper paper = accessSupport.requirePublishedPaper(paperId);
        accessSupport.ensureEligible(paper, studentUserId);
        ExamAnswer answer = accessSupport.requireAnswer(paperId, studentUserId);
        if (Integer.valueOf(ExamSupport.ANSWER_SUBMITTED).equals(answer.getStatus())) {
            return detailSupport.buildSubmitResp(answer, paper);
        }
        accessSupport.ensureWritable(paper);
        return submitInternal(answer, paper, LocalDateTime.now());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void autoSubmitExpired() {
        List<ExamAnswer> ongoing = examAnswerMapper.selectList(new LambdaQueryWrapper<ExamAnswer>()
                .eq(ExamAnswer::getStatus, ExamSupport.ANSWER_ONGOING)
                .orderByAsc(ExamAnswer::getId)
                .last("LIMIT " + AUTO_SCAN_LIMIT));
        if (ongoing.isEmpty()) {
            return;
        }
        Map<Long, ExamPaper> paperMap = examPaperMapper.selectBatchIds(ongoing.stream()
                        .map(ExamAnswer::getPaperId).distinct().toList())
                .stream()
                .collect(Collectors.toMap(ExamPaper::getId, Function.identity(), (first, second) -> first));
        LocalDateTime now = LocalDateTime.now();
        int handled = 0;
        for (ExamAnswer answer : ongoing) {
            ExamPaper paper = paperMap.get(answer.getPaperId());
            if (paper == null || accessSupport.isLocked(paper)
                    || !now.isAfter(detailSupport.deadline(paper, answer))) {
                continue;
            }
            try {
                submitInternal(answer, paper, now);
                handled++;
            } catch (Exception exception) {
                log.error("超时答卷自动提交失败，answerId={}", answer.getId(), exception);
            }
        }
        if (handled > 0) {
            log.info("超时答卷自动提交完成，共处理 {} 份", handled);
        }
    }

    /**
     * 创建答卷，并处理并发重复开始。
     *
     * @param paper         试卷
     * @param studentUserId 学生用户 ID
     * @param now           当前时间
     * @return 答卷
     */
    private ExamAnswer newAnswer(ExamPaper paper, Long studentUserId, LocalDateTime now) {
        ExamAnswer answer = new ExamAnswer();
        answer.setPaperId(paper.getId());
        answer.setRoundId(paper.getRoundId());
        answer.setMentorId(paper.getMentorId());
        answer.setStudentId(studentUserId);
        answer.setStartTime(now);
        answer.setObjectiveScore(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        answer.setTotalScore(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        answer.setStatus(ExamSupport.ANSWER_ONGOING);
        try {
            examAnswerMapper.insert(answer);
        } catch (DuplicateKeyException exception) {
            log.warn("重复开始答题，返回已有答卷，paperId={}，studentId={}", paper.getId(), studentUserId);
            answer = accessSupport.findAnswer(paper.getId(), studentUserId);
        }
        if (answer == null) {
            throw new BusinessException(ResultCode.DUPLICATE_SUBMIT, "答卷创建失败，请重试");
        }
        return answer;
    }

    /**
     * 执行判分并提交答卷。
     *
     * @param answer 答卷
     * @param paper  试卷
     * @param now    当前时间
     * @return 判分结果
     */
    private ExamSubmitRespVO submitInternal(ExamAnswer answer, ExamPaper paper, LocalDateTime now) {
        List<ExamPaperQuestion> relations = detailSupport.listRelations(paper.getId());
        Map<Long, Question> questionMap = detailSupport.loadQuestions(relations);
        Map<Long, ExamAnswerItem> itemMap = detailSupport.loadItems(answer.getId());
        BigDecimal total = BigDecimal.ZERO;
        int correctCount = 0;
        for (ExamPaperQuestion relation : relations) {
            Question question = questionMap.get(relation.getQuestionId());
            ExamAnswerItem item = itemMap.get(relation.getQuestionId());
            if (question == null || item == null) {
                continue;
            }
            boolean correct = examSupport.judge(question, item.getAnswerContent());
            item.setIsCorrect(correct ? 1 : 0);
            item.setScore(correct ? relation.getScore().setScale(2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            examAnswerItemMapper.updateById(item);
            if (correct) {
                total = total.add(relation.getScore());
                correctCount++;
            }
        }
        BigDecimal finalScore = total.setScale(2, RoundingMode.HALF_UP);
        answer.setObjectiveScore(finalScore);
        answer.setTotalScore(finalScore);
        answer.setStatus(ExamSupport.ANSWER_SUBMITTED);
        answer.setSubmitTime(now);
        examAnswerMapper.updateById(answer);
        log.info("在线答卷提交，answerId={}，paperId={}，studentId={}，score={}",
                answer.getId(), paper.getId(), answer.getStudentId(), finalScore);
        ExamSubmitRespVO resp = new ExamSubmitRespVO();
        resp.setAnswerId(answer.getId());
        resp.setObjectiveScore(finalScore);
        resp.setTotalScore(finalScore);
        resp.setTotalScoreOfPaper(paper.getTotalScore());
        resp.setCorrectCount(correctCount);
        resp.setQuestionCount(relations.size());
        resp.setSubmitTime(now);
        return resp;
    }

}
