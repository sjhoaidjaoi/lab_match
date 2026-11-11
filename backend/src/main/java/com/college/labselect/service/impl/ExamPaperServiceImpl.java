package com.college.labselect.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.college.labselect.common.PageResult;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.ExamPaperQuestionReqDTO;
import com.college.labselect.dto.req.ExamPaperSaveReqDTO;
import com.college.labselect.dto.resp.ExamPaperDetailVO;
import com.college.labselect.dto.resp.ExamPaperListVO;
import com.college.labselect.entity.ExamPaper;
import com.college.labselect.entity.ExamPaperQuestion;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.Question;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.ExamPaperMapper;
import com.college.labselect.mapper.ExamPaperQuestionMapper;
import com.college.labselect.mapper.QuestionMapper;
import com.college.labselect.service.IExamPaperService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * 导师在线试卷服务实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExamPaperServiceImpl implements IExamPaperService {

    private final ExamPaperMapper examPaperMapper;
    private final ExamPaperQuestionMapper examPaperQuestionMapper;
    private final QuestionMapper questionMapper;
    private final ExamSupport examSupport;
    private final ExamPaperQuerySupport querySupport;

    @Override
    public PageResult<ExamPaperListVO> pagePapers(Long teacherUserId, Long roundId, String keyword,
                                                  Integer status, long pageNum, long pageSize) {
        return querySupport.pagePapers(teacherUserId, roundId, keyword, status, pageNum, pageSize);
    }

    @Override
    public ExamPaperDetailVO getPaper(Long teacherUserId, Long id) {
        MentorProfile mentor = examSupport.requireMentor(teacherUserId);
        return querySupport.buildDetail(requireOwnPaper(mentor.getId(), id));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ExamPaperDetailVO createPaper(Long teacherUserId, ExamPaperSaveReqDTO req) {
        MentorProfile mentor = examSupport.requireMentor(teacherUserId);
        SelectionRound round = examSupport.requireRound(req.getRoundId());
        examSupport.ensureWritable(round);
        ExamPaper paper = new ExamPaper();
        paper.setRoundId(round.getId());
        paper.setLabId(mentor.getLabId());
        paper.setMentorId(mentor.getId());
        paper.setStatus(ExamSupport.PAPER_DRAFT);
        applyRequest(paper, mentor, req);
        examPaperMapper.insert(paper);
        savePaperQuestions(paper.getId(), mentor.getId(), req.getQuestions());
        log.info("新建在线试卷，mentorId={}，paperId={}，totalScore={}",
                mentor.getId(), paper.getId(), paper.getTotalScore());
        return querySupport.buildDetail(paper);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ExamPaperDetailVO updatePaper(Long teacherUserId, Long id, ExamPaperSaveReqDTO req) {
        MentorProfile mentor = examSupport.requireMentor(teacherUserId);
        ExamPaper paper = requireOwnPaper(mentor.getId(), id);
        if (!Integer.valueOf(ExamSupport.PAPER_DRAFT).equals(paper.getStatus())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "已发布试卷不可修改");
        }
        SelectionRound round = examSupport.requireRound(req.getRoundId() == null
                ? paper.getRoundId() : req.getRoundId());
        examSupport.ensureWritable(round);
        paper.setRoundId(round.getId());
        applyRequest(paper, mentor, req);
        examPaperMapper.updateById(paper);
        examPaperQuestionMapper.delete(new LambdaQueryWrapper<ExamPaperQuestion>()
                .eq(ExamPaperQuestion::getPaperId, paper.getId()));
        savePaperQuestions(paper.getId(), mentor.getId(), req.getQuestions());
        log.info("修改在线试卷，mentorId={}，paperId={}", mentor.getId(), paper.getId());
        return querySupport.buildDetail(paper);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deletePaper(Long teacherUserId, Long id) {
        MentorProfile mentor = examSupport.requireMentor(teacherUserId);
        ExamPaper paper = requireOwnPaper(mentor.getId(), id);
        if (!Integer.valueOf(ExamSupport.PAPER_DRAFT).equals(paper.getStatus())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "已发布试卷不可删除");
        }
        SelectionRound round = examSupport.requireRound(paper.getRoundId());
        examSupport.ensureWritable(round);
        examPaperQuestionMapper.delete(new LambdaQueryWrapper<ExamPaperQuestion>()
                .eq(ExamPaperQuestion::getPaperId, paper.getId()));
        examPaperMapper.deleteById(paper.getId());
        log.info("删除在线试卷草稿，mentorId={}，paperId={}", mentor.getId(), paper.getId());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void publishPaper(Long teacherUserId, Long id) {
        MentorProfile mentor = examSupport.requireMentor(teacherUserId);
        ExamPaper paper = requireOwnPaper(mentor.getId(), id);
        SelectionRound round = examSupport.requireRound(paper.getRoundId());
        examSupport.ensureWritable(round);
        if (!Integer.valueOf(ExamSupport.PAPER_DRAFT).equals(paper.getStatus())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "试卷已发布");
        }
        Long count = examPaperQuestionMapper.selectCount(new LambdaQueryWrapper<ExamPaperQuestion>()
                .eq(ExamPaperQuestion::getPaperId, paper.getId()));
        if (count == null || count == 0) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "试卷至少包含一道题");
        }
        if (paper.getEndTime() == null || !paper.getEndTime().isAfter(LocalDateTime.now())) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "答题结束时间已过，无法发布");
        }
        paper.setStatus(ExamSupport.PAPER_PUBLISHED);
        examPaperMapper.updateById(paper);
        log.info("发布在线试卷，mentorId={}，paperId={}", mentor.getId(), paper.getId());
    }

    /**
     * 校验并按请求填充试卷。
     *
     * @param paper  试卷实体
     * @param mentor 导师档案
     * @param req    请求
     */
    private void applyRequest(ExamPaper paper, MentorProfile mentor, ExamPaperSaveReqDTO req) {
        if (req.getStartTime() == null || req.getEndTime() == null
                || !req.getEndTime().isAfter(req.getStartTime())) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "答题结束时间必须晚于开始时间");
        }
        if (req.getDurationMinutes() == null || req.getDurationMinutes() < 1
                || req.getDurationMinutes() > 300) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "答题时长须为 1-300 分钟");
        }
        if (req.getQuestions() == null || req.getQuestions().isEmpty()) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "试卷至少包含一道题");
        }
        Set<Long> questionIds = new HashSet<>();
        BigDecimal total = BigDecimal.ZERO;
        for (ExamPaperQuestionReqDTO item : req.getQuestions()) {
            if (!questionIds.add(item.getQuestionId())) {
                throw new BusinessException(ResultCode.PARAM_ERROR, "试卷中存在重复题目");
            }
            Question question = questionMapper.selectById(item.getQuestionId());
            if (question == null) {
                throw new BusinessException(ResultCode.NOT_FOUND, "题目不存在：" + item.getQuestionId());
            }
            if (!Objects.equals(mentor.getId(), question.getMentorId())) {
                throw new BusinessException(ResultCode.FORBIDDEN, "只能选用本人题库中的题目");
            }
            if (!Integer.valueOf(ExamSupport.QUESTION_ENABLED).equals(question.getStatus())) {
                throw new BusinessException(ResultCode.BUSINESS_ERROR, "题目已停用，请先启用");
            }
            total = total.add(item.getScore());
        }
        paper.setTitle(StrUtil.trim(req.getTitle()));
        paper.setDescription(StrUtil.trim(req.getDescription()));
        paper.setStartTime(req.getStartTime());
        paper.setEndTime(req.getEndTime());
        paper.setDurationMinutes(req.getDurationMinutes());
        paper.setTotalScore(total.setScale(2, RoundingMode.HALF_UP));
    }

    /**
     * 写入试卷题目关联。
     *
     * @param paperId     试卷 ID
     * @param mentorId    导师档案 ID
     * @param questionReq 题目请求
     */
    private void savePaperQuestions(Long paperId, Long mentorId, List<ExamPaperQuestionReqDTO> questionReq) {
        int no = 1;
        for (ExamPaperQuestionReqDTO item : questionReq) {
            Question question = questionMapper.selectById(item.getQuestionId());
            if (question == null || !Objects.equals(mentorId, question.getMentorId())) {
                throw new BusinessException(ResultCode.FORBIDDEN, "只能选用本人题库中的题目");
            }
            ExamPaperQuestion relation = new ExamPaperQuestion();
            relation.setPaperId(paperId);
            relation.setQuestionId(item.getQuestionId());
            relation.setQuestionNo(no++);
            relation.setScore(item.getScore().setScale(2, RoundingMode.HALF_UP));
            examPaperQuestionMapper.insert(relation);
        }
    }

    /**
     * 查询并校验试卷归属。
     *
     * @param mentorId 导师档案 ID
     * @param id       试卷 ID
     * @return 试卷
     */
    private ExamPaper requireOwnPaper(Long mentorId, Long id) {
        ExamPaper paper = examPaperMapper.selectById(id);
        if (paper == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "试卷不存在");
        }
        if (!Objects.equals(mentorId, paper.getMentorId())) {
            throw new BusinessException(ResultCode.FORBIDDEN, "只能操作本人试卷");
        }
        return paper;
    }
}
