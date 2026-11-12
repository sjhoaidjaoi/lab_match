package com.college.labselect.service;

import com.college.labselect.common.PageResult;
import com.college.labselect.dto.req.QuestionSaveReqDTO;
import com.college.labselect.dto.resp.QuestionVO;

/**
 * 导师题库服务。
 */
public interface IQuestionService {

    /**
     * 分页查询本人题库。
     *
     * @param teacherUserId 教师用户 ID
     * @param questionType  题型，可为空
     * @param keyword       题干关键词，可为空
     * @param status        状态，可为空
     * @param pageNum       页码
     * @param pageSize      每页条数
     * @return 分页结果
     */
    PageResult<QuestionVO> pageQuestions(Long teacherUserId, Integer questionType, String keyword,
                                         Integer status, long pageNum, long pageSize);

    /**
     * 新增题目。
     *
     * @param teacherUserId 教师用户 ID
     * @param req           题目请求
     * @return 题目详情
     */
    QuestionVO createQuestion(Long teacherUserId, QuestionSaveReqDTO req);

    /**
     * 修改本人题目。
     *
     * @param teacherUserId 教师用户 ID
     * @param id            题目 ID
     * @param req           题目请求
     * @return 题目详情
     */
    QuestionVO updateQuestion(Long teacherUserId, Long id, QuestionSaveReqDTO req);

    /**
     * 删除或停用本人题目。
     *
     * @param teacherUserId 教师用户 ID
     * @param id            题目 ID
     */
    void deleteQuestion(Long teacherUserId, Long id);
}
