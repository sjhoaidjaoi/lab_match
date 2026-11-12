package com.college.labselect.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.college.labselect.common.PageResult;
import com.college.labselect.common.ResultCode;
import com.college.labselect.common.StatusTextUtils;
import com.college.labselect.dto.req.QuestionSaveReqDTO;
import com.college.labselect.dto.resp.QuestionVO;
import com.college.labselect.entity.ExamPaperQuestion;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.Question;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.ExamPaperQuestionMapper;
import com.college.labselect.mapper.QuestionMapper;
import com.college.labselect.service.IQuestionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * 导师题库服务实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class QuestionServiceImpl implements IQuestionService {

    private static final BigDecimal MAX_SCORE = new BigDecimal("100");
    private static final int OPTION_MIN = 2;

    private final QuestionMapper questionMapper;
    private final ExamPaperQuestionMapper examPaperQuestionMapper;
    private final ExamSupport examSupport;

    @Override
    public PageResult<QuestionVO> pageQuestions(Long teacherUserId, Integer questionType, String keyword,
                                                Integer status, long pageNum, long pageSize) {
        MentorProfile mentor = examSupport.requireMentor(teacherUserId);
        long safePage = Math.max(1, pageNum);
        long safeSize = pageSize < 1 ? 10 : Math.min(pageSize, 100);
        LambdaQueryWrapper<Question> wrapper = new LambdaQueryWrapper<Question>()
                .eq(Question::getMentorId, mentor.getId())
                .eq(questionType != null, Question::getQuestionType, questionType)
                .eq(status != null, Question::getStatus, status)
                .like(StrUtil.isNotBlank(keyword), Question::getContent, StrUtil.trim(keyword))
                .orderByDesc(Question::getId);
        Page<Question> page = questionMapper.selectPage(new Page<>(safePage, safeSize), wrapper);
        List<QuestionVO> list = page.getRecords().stream().map(this::toVO).toList();
        return new PageResult<>(page.getTotal(), safePage, safeSize, new ArrayList<>(list));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public QuestionVO createQuestion(Long teacherUserId, QuestionSaveReqDTO req) {
        MentorProfile mentor = examSupport.requireMentor(teacherUserId);
        ensureWritable();
        Question question = new Question();
        question.setMentorId(mentor.getId());
        question.setLabId(mentor.getLabId());
        applyRequest(question, req);
        question.setStatus(ExamSupport.QUESTION_ENABLED);
        questionMapper.insert(question);
        log.info("新增题库题目，mentorId={}，questionId={}，type={}",
                mentor.getId(), question.getId(), question.getQuestionType());
        return toVO(question);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public QuestionVO updateQuestion(Long teacherUserId, Long id, QuestionSaveReqDTO req) {
        MentorProfile mentor = examSupport.requireMentor(teacherUserId);
        ensureWritable();
        Question question = requireOwnQuestion(mentor.getId(), id);
        applyRequest(question, req);
        questionMapper.updateById(question);
        log.info("修改题库题目，mentorId={}，questionId={}", mentor.getId(), question.getId());
        return toVO(question);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteQuestion(Long teacherUserId, Long id) {
        MentorProfile mentor = examSupport.requireMentor(teacherUserId);
        ensureWritable();
        Question question = requireOwnQuestion(mentor.getId(), id);
        Long referenced = examPaperQuestionMapper.selectCount(new LambdaQueryWrapper<ExamPaperQuestion>()
                .eq(ExamPaperQuestion::getQuestionId, id));
        if (referenced != null && referenced > 0) {
            question.setStatus(ExamSupport.QUESTION_DISABLED);
            questionMapper.updateById(question);
            log.info("题目已被试卷引用，改为停用，questionId={}", id);
        } else {
            questionMapper.deleteById(id);
            log.info("删除题库题目，questionId={}", id);
        }
    }

    /**
     * 校验批次锁定状态。
     */
    private void ensureWritable() {
        SelectionRound round = examSupport.currentRound();
        if (round != null) {
            examSupport.ensureWritable(round);
        }
    }

    /**
     * 查询并校验题目归属。
     *
     * @param mentorId 导师档案 ID
     * @param id       题目 ID
     * @return 题目
     */
    private Question requireOwnQuestion(Long mentorId, Long id) {
        Question question = questionMapper.selectById(id);
        if (question == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "题目不存在");
        }
        if (!Objects.equals(mentorId, question.getMentorId())) {
            throw new BusinessException(ResultCode.FORBIDDEN, "只能操作本人题库");
        }
        return question;
    }

    /**
     * 应用请求并校验题目内容。
     *
     * @param question 题目实体
     * @param req      请求
     */
    private void applyRequest(Question question, QuestionSaveReqDTO req) {
        int type = req.getQuestionType();
        String content = StrUtil.trim(req.getContent());
        if (StrUtil.isBlank(content)) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "题干不能为空");
        }
        BigDecimal score = req.getScore();
        if (score == null || score.compareTo(BigDecimal.ZERO) <= 0 || score.compareTo(MAX_SCORE) > 0) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "单题分值必须在 0.01-100 之间");
        }
        List<String> options = req.getOptions() == null ? new ArrayList<>() : req.getOptions().stream()
                .map(StrUtil::trim)
                .filter(StrUtil::isNotBlank)
                .collect(Collectors.toCollection(ArrayList::new));
        question.setQuestionType(type);
        question.setContent(content);
        question.setScore(score.setScale(2, RoundingMode.HALF_UP));
        switch (type) {
            case ExamSupport.TYPE_SINGLE -> {
                examSupport.checkOptionSize(options);
                String correct = examSupport.normalizeChoice(req.getCorrectAnswer());
                ensureOptionKey(options, correct);
                question.setOptionsJson(examSupport.toOptionsJson(options));
                question.setCorrectAnswer(correct);
            }
            case ExamSupport.TYPE_MULTI -> {
                examSupport.checkOptionSize(options);
                String correct = examSupport.normalizeMultiAnswer(req.getCorrectAnswer());
                List<String> keys = List.of(correct.split(","));
                if (keys.size() < OPTION_MIN) {
                    throw new BusinessException(ResultCode.PARAM_ERROR, "多选题至少设置两个正确答案");
                }
                keys.forEach(key -> ensureOptionKey(options, key));
                question.setOptionsJson(examSupport.toOptionsJson(options));
                question.setCorrectAnswer(correct);
            }
            case ExamSupport.TYPE_JUDGE -> {
                String correct = examSupport.normalizeChoice(req.getCorrectAnswer());
                if (!"T".equals(correct) && !"F".equals(correct)) {
                    throw new BusinessException(ResultCode.PARAM_ERROR, "判断题答案只能为 T 或 F");
                }
                question.setOptionsJson(null);
                question.setCorrectAnswer(correct);
            }
            case ExamSupport.TYPE_BLANK -> {
                String correct = StrUtil.trimToEmpty(req.getCorrectAnswer());
                if (StrUtil.isBlank(correct)) {
                    throw new BusinessException(ResultCode.PARAM_ERROR, "填空题答案不能为空");
                }
                question.setOptionsJson(null);
                question.setCorrectAnswer(correct);
            }
            default -> throw new BusinessException(ResultCode.PARAM_ERROR, "题型取值 1-4");
        }
    }

    /**
     * 校验答案键属于选项。
     *
     * @param options 选项列表
     * @param key     答案键
     */
    private void ensureOptionKey(List<String> options, String key) {
        boolean exists = false;
        for (int index = 0; index < options.size(); index++) {
            if (examSupport.optionKey(index).equals(key)) {
                exists = true;
                break;
            }
        }
        if (!exists) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "正确答案不在选项范围内");
        }
    }

    /**
     * 实体转响应。
     *
     * @param question 题目实体
     * @return 题目响应
     */
    private QuestionVO toVO(Question question) {
        QuestionVO vo = new QuestionVO();
        vo.setId(question.getId());
        vo.setQuestionType(question.getQuestionType());
        vo.setQuestionTypeText(StatusTextUtils.questionType(question.getQuestionType()));
        vo.setContent(question.getContent());
        vo.setOptions(examSupport.parseOptions(question.getOptionsJson()));
        vo.setCorrectAnswer(question.getCorrectAnswer());
        vo.setScore(question.getScore());
        vo.setStatus(question.getStatus());
        vo.setStatusText(StatusTextUtils.questionStatus(question.getStatus()));
        return vo;
    }
}
