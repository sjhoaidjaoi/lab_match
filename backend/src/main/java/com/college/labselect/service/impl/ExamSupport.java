package com.college.labselect.service.impl;

import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.college.labselect.common.ResultCode;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.Question;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.SelectionRoundMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * 在线笔试公共支撑：导师身份、轮次与题型常量。
 */
@Component
@RequiredArgsConstructor
public class ExamSupport {

    public static final int LOCKED = 1;
    public static final int QUESTION_ENABLED = 1;
    public static final int QUESTION_DISABLED = 0;
    public static final int PAPER_DRAFT = 1;
    public static final int PAPER_PUBLISHED = 2;
    public static final int ANSWER_ONGOING = 1;
    public static final int ANSWER_SUBMITTED = 2;
    public static final int TYPE_SINGLE = 1;
    public static final int TYPE_MULTI = 2;
    public static final int TYPE_JUDGE = 3;
    public static final int TYPE_BLANK = 4;

    private static final int CHOICE_MIN_OPTIONS = 2;
    private static final int CHOICE_MAX_OPTIONS = 8;

    private final MentorProfileMapper mentorProfileMapper;
    private final SelectionRoundMapper selectionRoundMapper;

    /**
     * 查询当前教师对应的导师档案。
     *
     * @param teacherUserId 教师用户 ID
     * @return 导师档案
     */
    public MentorProfile requireMentor(Long teacherUserId) {
        MentorProfile mentor = mentorProfileMapper.selectOne(new LambdaQueryWrapper<MentorProfile>()
                .eq(MentorProfile::getUserId, teacherUserId));
        if (mentor == null) {
            throw new BusinessException(ResultCode.FORBIDDEN, "仅导师可维护题库与试卷");
        }
        return mentor;
    }

    /**
     * 查询指定轮次，缺省取最近轮次。
     *
     * @param roundId 轮次 ID，可为空
     * @return 选拔轮次
     */
    public SelectionRound requireRound(Long roundId) {
        SelectionRound round = findRound(roundId);
        if (round == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "选拔轮次不存在");
        }
        return round;
    }

    /**
     * 查询指定轮次，缺省取最近轮次。
     *
     * @param roundId 轮次 ID，可为空
     * @return 选拔轮次，不存在返回 null
     */
    public SelectionRound findRound(Long roundId) {
        return roundId == null ? currentRound() : selectionRoundMapper.selectById(roundId);
    }

    /**
     * 查询最近轮次。
     *
     * @return 选拔轮次，无轮次返回 null
     */
    public SelectionRound currentRound() {
        return selectionRoundMapper.selectOne(new LambdaQueryWrapper<SelectionRound>()
                .orderByDesc(SelectionRound::getRoundNo)
                .last("LIMIT 1"));
    }

    /**
     * 校验批次未锁定。
     *
     * @param round 选拔轮次
     */
    public void ensureWritable(SelectionRound round) {
        if (Integer.valueOf(LOCKED).equals(round.getLocked())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "批次已锁定，不可修改在线笔试");
        }
    }

    /**
     * 解析选项 JSON。
     *
     * @param optionsJson 选项 JSON 数组
     * @return 选项文本列表
     */
    public List<String> parseOptions(String optionsJson) {
        if (StrUtil.isBlank(optionsJson)) {
            return new ArrayList<>();
        }
        try {
            return JSONUtil.toList(optionsJson, String.class);
        } catch (Exception exception) {
            return new ArrayList<>();
        }
    }

    /**
     * 序列化选项为 JSON。
     *
     * @param options 选项文本列表
     * @return JSON 字符串
     */
    public String toOptionsJson(List<String> options) {
        return JSONUtil.toJsonStr(options == null ? List.of() : options);
    }

    /**
     * 规范化单选 / 判断答案。
     *
     * @param answer 原始答案
     * @return 去空格并大写后的答案
     */
    public String normalizeChoice(String answer) {
        return StrUtil.trimToEmpty(answer).toUpperCase();
    }

    /**
     * 规范化多选答案，按字母升序去重。
     *
     * @param answer 原始答案，逗号分隔
     * @return 规范化答案
     */
    public String normalizeMultiAnswer(String answer) {
        if (StrUtil.isBlank(answer)) {
            return "";
        }
        return Arrays.stream(answer.split("[,，\\s]+"))
                .map(this::normalizeChoice)
                .filter(StrUtil::isNotBlank)
                .distinct()
                .sorted()
                .reduce((left, right) -> left + "," + right)
                .orElse("");
    }

    /**
     * 校验选择题选项数量。
     *
     * @param options 选项列表
     */
    public void checkOptionSize(List<String> options) {
        int size = options == null ? 0 : options.size();
        if (size < CHOICE_MIN_OPTIONS || size > CHOICE_MAX_OPTIONS) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "选择题选项数量须为 2-8 个");
        }
    }

    /**
     * 选项序号转字母键。
     *
     * @param index 从 0 开始的下标
     * @return A/B/C… 键
     */
    public String optionKey(int index) {
        return String.valueOf((char) ('A' + index));
    }

    /**
     * 自动判分：单选/判断精确匹配，多选集合匹配，填空任一标准答案匹配。
     *
     * @param question      题库题目
     * @param answerContent 学生作答
     * @return 是否答对
     */
    public boolean judge(Question question, String answerContent) {
        if (question == null || StrUtil.isBlank(answerContent) || StrUtil.isBlank(question.getCorrectAnswer())) {
            return false;
        }
        String correct = question.getCorrectAnswer();
        return switch (question.getQuestionType() == null ? 0 : question.getQuestionType()) {
            case TYPE_SINGLE, TYPE_JUDGE -> normalizeChoice(answerContent).equals(normalizeChoice(correct));
            case TYPE_MULTI -> normalizeMultiAnswer(answerContent).equals(normalizeMultiAnswer(correct));
            case TYPE_BLANK -> Arrays.stream(correct.split("\\|"))
                    .map(StrUtil::trim)
                    .filter(StrUtil::isNotBlank)
                    .anyMatch(item -> item.equalsIgnoreCase(StrUtil.trim(answerContent)));
            default -> false;
        };
    }
}
