package com.college.labselect.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.college.labselect.common.StatusTextUtils;
import com.college.labselect.dto.resp.ExamSubmitRespVO;
import com.college.labselect.dto.resp.StudentExamDetailVO;
import com.college.labselect.dto.resp.StudentExamQuestionVO;
import com.college.labselect.entity.ExamAnswer;
import com.college.labselect.entity.ExamAnswerItem;
import com.college.labselect.entity.ExamPaper;
import com.college.labselect.entity.ExamPaperQuestion;
import com.college.labselect.entity.Lab;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.Question;
import com.college.labselect.entity.SysUser;
import com.college.labselect.mapper.ExamAnswerItemMapper;
import com.college.labselect.mapper.ExamPaperQuestionMapper;
import com.college.labselect.mapper.LabMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.QuestionMapper;
import com.college.labselect.mapper.SysUserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 学生答题详情组装支撑。
 */
@Component
@RequiredArgsConstructor
public class ExamAnswerDetailSupport {

    private final ExamPaperQuestionMapper examPaperQuestionMapper;
    private final ExamAnswerItemMapper examAnswerItemMapper;
    private final QuestionMapper questionMapper;
    private final MentorProfileMapper mentorProfileMapper;
    private final SysUserMapper sysUserMapper;
    private final LabMapper labMapper;
    private final ExamSupport examSupport;

    /**
     * 构建学生答题详情。
     *
     * @param paper  试卷
     * @param answer 答卷，可为空
     * @return 答题详情
     */
    public StudentExamDetailVO buildDetail(ExamPaper paper, ExamAnswer answer) {
        List<ExamPaperQuestion> relations = listRelations(paper.getId());
        Map<Long, Question> questionMap = loadQuestions(relations);
        Map<Long, ExamAnswerItem> itemMap = answer == null ? Map.of() : loadItems(answer.getId());
        List<StudentExamQuestionVO> questions = new ArrayList<>();
        for (ExamPaperQuestion relation : relations) {
            Question question = questionMap.get(relation.getQuestionId());
            if (question == null) {
                continue;
            }
            StudentExamQuestionVO vo = new StudentExamQuestionVO();
            vo.setQuestionId(question.getId());
            vo.setQuestionNo(relation.getQuestionNo());
            vo.setQuestionType(question.getQuestionType());
            vo.setQuestionTypeText(StatusTextUtils.questionType(question.getQuestionType()));
            vo.setContent(question.getContent());
            vo.setOptions(examSupport.parseOptions(question.getOptionsJson()));
            vo.setScore(relation.getScore());
            ExamAnswerItem item = itemMap.get(question.getId());
            vo.setAnswerContent(item == null ? null : item.getAnswerContent());
            questions.add(vo);
        }
        StudentExamDetailVO detail = new StudentExamDetailVO();
        detail.setPaperId(paper.getId());
        detail.setTitle(paper.getTitle());
        detail.setDescription(paper.getDescription());
        detail.setMentorName(mentorName(paper.getMentorId()));
        detail.setLabName(labName(paper.getLabId()));
        detail.setStartTime(paper.getStartTime());
        detail.setEndTime(paper.getEndTime());
        detail.setDurationMinutes(paper.getDurationMinutes());
        detail.setTotalScore(paper.getTotalScore());
        int answerStatus = answer == null ? 0 : answer.getStatus();
        detail.setAnswerStatus(answerStatus);
        detail.setAnswerStatusText(StatusTextUtils.examAnswerStatus(answerStatus));
        detail.setRemainingSeconds(answer != null && Integer.valueOf(ExamSupport.ANSWER_ONGOING)
                .equals(answer.getStatus()) ? remainingSeconds(paper, answer) : 0L);
        detail.setSubmittedTime(answer == null ? null : answer.getSubmitTime());
        detail.setMyScore(answer != null && Integer.valueOf(ExamSupport.ANSWER_SUBMITTED)
                .equals(answer.getStatus()) ? answer.getTotalScore() : null);
        detail.setQuestions(questions);
        return detail;
    }

    /**
     * 查询试卷题目关联。
     *
     * @param paperId 试卷 ID
     * @return 关联列表
     */
    public List<ExamPaperQuestion> listRelations(Long paperId) {
        return examPaperQuestionMapper.selectList(new LambdaQueryWrapper<ExamPaperQuestion>()
                .eq(ExamPaperQuestion::getPaperId, paperId)
                .orderByAsc(ExamPaperQuestion::getQuestionNo));
    }

    /**
     * 批量加载题目。
     *
     * @param relations 试卷题目关联
     * @return 题目映射
     */
    public Map<Long, Question> loadQuestions(List<ExamPaperQuestion> relations) {
        List<Long> ids = relations.stream().map(ExamPaperQuestion::getQuestionId).distinct().toList();
        if (ids.isEmpty()) {
            return new HashMap<>();
        }
        return questionMapper.selectBatchIds(ids).stream()
                .collect(Collectors.toMap(Question::getId, Function.identity(), (first, second) -> first));
    }

    /**
     * 加载答卷明细。
     *
     * @param answerId 答卷 ID
     * @return 题目 ID 到明细的映射
     */
    public Map<Long, ExamAnswerItem> loadItems(Long answerId) {
        return examAnswerItemMapper.selectList(new LambdaQueryWrapper<ExamAnswerItem>()
                        .eq(ExamAnswerItem::getAnswerId, answerId))
                .stream()
                .collect(Collectors.toMap(ExamAnswerItem::getQuestionId, Function.identity(), (first, second) -> first));
    }

    /**
     * 构建已提交答卷的判分响应。
     *
     * @param answer 答卷
     * @param paper  试卷
     * @return 判分结果
     */
    public ExamSubmitRespVO buildSubmitResp(ExamAnswer answer, ExamPaper paper) {
        Long correct = examAnswerItemMapper.selectCount(new LambdaQueryWrapper<ExamAnswerItem>()
                .eq(ExamAnswerItem::getAnswerId, answer.getId())
                .eq(ExamAnswerItem::getIsCorrect, 1));
        Long questionCount = examPaperQuestionMapper.selectCount(new LambdaQueryWrapper<ExamPaperQuestion>()
                .eq(ExamPaperQuestion::getPaperId, paper.getId()));
        ExamSubmitRespVO resp = new ExamSubmitRespVO();
        resp.setAnswerId(answer.getId());
        resp.setObjectiveScore(answer.getObjectiveScore());
        resp.setTotalScore(answer.getTotalScore());
        resp.setTotalScoreOfPaper(paper.getTotalScore());
        resp.setCorrectCount(correct == null ? 0 : correct.intValue());
        resp.setQuestionCount(questionCount == null ? 0 : questionCount.intValue());
        resp.setSubmitTime(answer.getSubmitTime());
        return resp;
    }

    /**
     * 计算答题截止时间。
     *
     * @param paper  试卷
     * @param answer 答卷
     * @return 截止时间
     */
    public LocalDateTime deadline(ExamPaper paper, ExamAnswer answer) {
        LocalDateTime byDuration = answer.getStartTime().plusMinutes(paper.getDurationMinutes());
        return byDuration.isBefore(paper.getEndTime()) ? byDuration : paper.getEndTime();
    }

    /**
     * 计算剩余秒数。
     *
     * @param paper  试卷
     * @param answer 答卷
     * @return 剩余秒数，最小为 0
     */
    public long remainingSeconds(ExamPaper paper, ExamAnswer answer) {
        long seconds = Duration.between(LocalDateTime.now(), deadline(paper, answer)).getSeconds();
        return Math.max(0L, seconds);
    }

    /**
     * 查询导师姓名。
     *
     * @param mentorId 导师档案 ID
     * @return 姓名
     */
    public String mentorName(Long mentorId) {
        if (mentorId == null) {
            return "";
        }
        MentorProfile mentor = mentorProfileMapper.selectById(mentorId);
        if (mentor == null || mentor.getUserId() == null) {
            return "";
        }
        SysUser user = sysUserMapper.selectById(mentor.getUserId());
        return user == null ? "" : StrUtil.nullToEmpty(user.getRealName());
    }

    /**
     * 查询实训室名称。
     *
     * @param labId 实训室 ID
     * @return 名称
     */
    public String labName(Long labId) {
        if (labId == null) {
            return "";
        }
        Lab lab = labMapper.selectById(labId);
        return lab == null ? "" : StrUtil.nullToEmpty(lab.getLabName());
    }
}
