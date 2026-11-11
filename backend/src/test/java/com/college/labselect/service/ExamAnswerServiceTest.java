package com.college.labselect.service;

import com.college.labselect.dto.resp.ExamSubmitRespVO;
import com.college.labselect.entity.ExamAnswer;
import com.college.labselect.entity.ExamAnswerItem;
import com.college.labselect.entity.ExamPaper;
import com.college.labselect.entity.ExamPaperQuestion;
import com.college.labselect.entity.Question;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.ExamAnswerItemMapper;
import com.college.labselect.mapper.ExamAnswerMapper;
import com.college.labselect.mapper.ExamPaperMapper;
import com.college.labselect.mapper.ExamPaperQuestionMapper;
import com.college.labselect.mapper.IntentionItemMapper;
import com.college.labselect.mapper.IntentionMapper;
import com.college.labselect.service.impl.ExamAccessSupport;
import com.college.labselect.service.impl.ExamAnswerDetailSupport;
import com.college.labselect.service.impl.ExamAnswerServiceImpl;
import com.college.labselect.service.impl.ExamSupport;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 学生在线答题服务单元测试。
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ExamAnswerServiceTest {

    @Mock
    private ExamPaperMapper examPaperMapper;

    @Mock
    private ExamPaperQuestionMapper examPaperQuestionMapper;

    @Mock
    private ExamAnswerMapper examAnswerMapper;

    @Mock
    private ExamAnswerItemMapper examAnswerItemMapper;

    @Mock
    private IntentionMapper intentionMapper;

    @Mock
    private IntentionItemMapper intentionItemMapper;

    @Mock
    private ExamSupport examSupport;

    @Mock
    private ExamAccessSupport accessSupport;

    @Mock
    private ExamAnswerDetailSupport detailSupport;

    @InjectMocks
    private ExamAnswerServiceImpl examAnswerService;

    /**
     * 快乐路径：交卷按题目判分并累计总分。
     */
    @Test
    void submitExam_shouldAutoGrade() {
        ExamPaper paper = paper();
        ExamAnswer answer = answer();
        when(accessSupport.requirePublishedPaper(900L)).thenReturn(paper);
        when(accessSupport.requireAnswer(900L, 1001L)).thenReturn(answer);
        when(detailSupport.listRelations(900L)).thenReturn(List.of(relation(101L, "10.00"), relation(102L, "10.00")));
        Question single = question(101L, 1, "A");
        Question blank = question(102L, 4, "TCP");
        when(detailSupport.loadQuestions(any())).thenReturn(Map.of(101L, single, 102L, blank));
        ExamAnswerItem first = item(101L, "A");
        ExamAnswerItem second = item(102L, "UDP");
        when(detailSupport.loadItems(55L)).thenReturn(Map.of(101L, first, 102L, second));
        when(examSupport.judge(single, "A")).thenReturn(true);
        when(examSupport.judge(blank, "UDP")).thenReturn(false);

        ExamSubmitRespVO result = examAnswerService.submitExam(1001L, 900L);

        assertThat(result.getTotalScore()).isEqualByComparingTo("10.00");
        assertThat(result.getCorrectCount()).isEqualTo(1);
        assertThat(result.getQuestionCount()).isEqualTo(2);
        assertThat(answer.getStatus()).isEqualTo(2);
        assertThat(first.getIsCorrect()).isEqualTo(1);
        assertThat(second.getIsCorrect()).isEqualTo(0);
        verify(examAnswerMapper).updateById(any(ExamAnswer.class));
    }

    /**
     * 边界：答题开始前调用开始接口返回 400004。
     */
    @Test
    void startExam_beforeWindow_shouldThrow400004() {
        ExamPaper paper = paper();
        paper.setStartTime(LocalDateTime.now().plusHours(1));
        paper.setEndTime(LocalDateTime.now().plusHours(3));
        when(accessSupport.requirePublishedPaper(900L)).thenReturn(paper);
        when(accessSupport.findAnswer(900L, 1001L)).thenReturn(null);

        BusinessException exception = catchThrowableOfType(
                () -> examAnswerService.startExam(1001L, 900L), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400004);
    }

    private ExamPaper paper() {
        ExamPaper paper = new ExamPaper();
        paper.setId(900L);
        paper.setRoundId(1L);
        paper.setMentorId(11L);
        paper.setTotalScore(new BigDecimal("20.00"));
        paper.setDurationMinutes(60);
        paper.setStartTime(LocalDateTime.now().minusHours(1));
        paper.setEndTime(LocalDateTime.now().plusHours(1));
        paper.setStatus(2);
        return paper;
    }

    private ExamAnswer answer() {
        ExamAnswer answer = new ExamAnswer();
        answer.setId(55L);
        answer.setPaperId(900L);
        answer.setStudentId(1001L);
        answer.setStartTime(LocalDateTime.now().minusMinutes(10));
        answer.setObjectiveScore(BigDecimal.ZERO);
        answer.setTotalScore(BigDecimal.ZERO);
        answer.setStatus(1);
        return answer;
    }

    private ExamPaperQuestion relation(Long questionId, String score) {
        ExamPaperQuestion relation = new ExamPaperQuestion();
        relation.setPaperId(900L);
        relation.setQuestionId(questionId);
        relation.setScore(new BigDecimal(score));
        return relation;
    }

    private Question question(Long id, int type, String correct) {
        Question question = new Question();
        question.setId(id);
        question.setQuestionType(type);
        question.setCorrectAnswer(correct);
        return question;
    }

    private ExamAnswerItem item(Long questionId, String content) {
        ExamAnswerItem item = new ExamAnswerItem();
        item.setAnswerId(55L);
        item.setQuestionId(questionId);
        item.setAnswerContent(content);
        item.setIsCorrect(0);
        item.setScore(BigDecimal.ZERO);
        return item;
    }
}
