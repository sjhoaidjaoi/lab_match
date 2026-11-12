package com.college.labselect.service;

import com.college.labselect.dto.req.ExamPaperQuestionReqDTO;
import com.college.labselect.dto.req.ExamPaperSaveReqDTO;
import com.college.labselect.dto.resp.ExamPaperDetailVO;
import com.college.labselect.entity.ExamPaper;
import com.college.labselect.entity.ExamPaperQuestion;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.Question;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.ExamAnswerMapper;
import com.college.labselect.mapper.ExamPaperMapper;
import com.college.labselect.mapper.ExamPaperQuestionMapper;
import com.college.labselect.mapper.QuestionMapper;
import com.college.labselect.service.impl.ExamPaperQuerySupport;
import com.college.labselect.service.impl.ExamPaperServiceImpl;
import com.college.labselect.service.impl.ExamSupport;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 在线试卷服务单元测试。
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ExamPaperServiceTest {

    @Mock
    private ExamPaperMapper examPaperMapper;

    @Mock
    private ExamPaperQuestionMapper examPaperQuestionMapper;

    @Mock
    private QuestionMapper questionMapper;

    @Mock
    private ExamAnswerMapper examAnswerMapper;

    @Mock
    private ExamSupport examSupport;

    @Mock
    private ExamPaperQuerySupport querySupport;

    @InjectMocks
    private ExamPaperServiceImpl examPaperService;

    /**
     * 快乐路径：组卷总分等于各题分值之和。
     */
    @Test
    void createPaper_shouldSumQuestionScores() {
        when(examSupport.requireMentor(2001L)).thenReturn(mentor());
        when(examSupport.requireRound(null)).thenReturn(round());
        when(questionMapper.selectById(101L)).thenReturn(question(101L, "5.00"));
        when(questionMapper.selectById(102L)).thenReturn(question(102L, "10.00"));
        when(examPaperMapper.insert(any(ExamPaper.class))).thenAnswer(invocation -> {
            ExamPaper paper = invocation.getArgument(0);
            paper.setId(900L);
            return 1;
        });
        when(examPaperQuestionMapper.selectList(any())).thenReturn(List.of());
        when(querySupport.buildDetail(any(ExamPaper.class))).thenReturn(new ExamPaperDetailVO());

        examPaperService.createPaper(2001L, request());

        ArgumentCaptor<ExamPaper> captor = ArgumentCaptor.forClass(ExamPaper.class);
        verify(examPaperMapper).insert(captor.capture());
        assertThat(captor.getValue().getTotalScore()).isEqualByComparingTo("15.00");
        verify(examPaperQuestionMapper, times(2)).insert(any(ExamPaperQuestion.class));
    }

    /**
     * 边界：已发布试卷不可修改，返回 400005。
     */
    @Test
    void updatePublishedPaper_shouldThrow400005() {
        when(examSupport.requireMentor(2001L)).thenReturn(mentor());
        ExamPaper paper = new ExamPaper();
        paper.setId(900L);
        paper.setMentorId(11L);
        paper.setStatus(2);
        when(examPaperMapper.selectById(900L)).thenReturn(paper);

        BusinessException exception = catchThrowableOfType(
                () -> examPaperService.updatePaper(2001L, 900L, request()), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400005);
    }

    private MentorProfile mentor() {
        MentorProfile mentor = new MentorProfile();
        mentor.setId(11L);
        mentor.setLabId(1L);
        return mentor;
    }

    private SelectionRound round() {
        SelectionRound round = new SelectionRound();
        round.setId(1L);
        round.setLocked(0);
        return round;
    }

    private Question question(Long id, String score) {
        Question question = new Question();
        question.setId(id);
        question.setMentorId(11L);
        question.setQuestionType(1);
        question.setContent("题目" + id);
        question.setCorrectAnswer("A");
        question.setScore(new BigDecimal(score));
        question.setStatus(1);
        return question;
    }

    private ExamPaperSaveReqDTO request() {
        ExamPaperSaveReqDTO req = new ExamPaperSaveReqDTO();
        req.setTitle("测试试卷");
        req.setStartTime(LocalDateTime.now().plusHours(1));
        req.setEndTime(LocalDateTime.now().plusHours(3));
        req.setDurationMinutes(60);
        ExamPaperQuestionReqDTO first = new ExamPaperQuestionReqDTO();
        first.setQuestionId(101L);
        first.setScore(new BigDecimal("5.00"));
        ExamPaperQuestionReqDTO second = new ExamPaperQuestionReqDTO();
        second.setQuestionId(102L);
        second.setScore(new BigDecimal("10.00"));
        req.setQuestions(List.of(first, second));
        return req;
    }
}
