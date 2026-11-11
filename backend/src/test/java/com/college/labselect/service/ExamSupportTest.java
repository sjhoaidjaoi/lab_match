package com.college.labselect.service;

import com.college.labselect.entity.Question;
import com.college.labselect.service.impl.ExamSupport;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 客观题自动判分规则单元测试。
 */
class ExamSupportTest {

    private final ExamSupport examSupport = new ExamSupport(null, null);

    /**
     * 单选忽略大小写与首尾空格。
     */
    @Test
    void judge_single_shouldIgnoreCaseAndSpace() {
        Question question = question(1, "A");
        assertThat(examSupport.judge(question, " a ")).isTrue();
        assertThat(examSupport.judge(question, "B")).isFalse();
    }

    /**
     * 多选按集合匹配，与顺序无关。
     */
    @Test
    void judge_multi_shouldIgnoreOrder() {
        Question question = question(2, "A,C");
        assertThat(examSupport.judge(question, "c, a")).isTrue();
        assertThat(examSupport.judge(question, "A,B,C")).isFalse();
    }

    /**
     * 填空命中任一标准答案即得分。
     */
    @Test
    void judge_blank_shouldMatchAnyAlternative() {
        Question question = question(4, "TCP|传输控制协议");
        assertThat(examSupport.judge(question, " 传输控制协议 ")).isTrue();
        assertThat(examSupport.judge(question, "tcp")).isTrue();
        assertThat(examSupport.judge(question, "UDP")).isFalse();
    }

    /**
     * 空白作答一律不得分。
     */
    @Test
    void judge_blankAnswer_shouldReturnFalse() {
        Question question = question(4, "TCP");
        assertThat(examSupport.judge(question, "   ")).isFalse();
        assertThat(examSupport.judge(question, null)).isFalse();
    }

    /**
     * 构造题目。
     *
     * @param type    题型
     * @param correct 正确答案
     * @return 题目
     */
    private Question question(int type, String correct) {
        Question question = new Question();
        question.setQuestionType(type);
        question.setCorrectAnswer(correct);
        return question;
    }
}
