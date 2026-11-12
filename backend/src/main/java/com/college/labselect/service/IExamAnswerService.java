package com.college.labselect.service;

import com.college.labselect.dto.req.ExamAnswerSaveReqDTO;
import com.college.labselect.dto.resp.ExamSaveRespVO;
import com.college.labselect.dto.resp.ExamSubmitRespVO;
import com.college.labselect.dto.resp.StudentExamDetailVO;
import com.college.labselect.dto.resp.StudentExamListVO;

import java.util.List;

/**
 * 学生在线答题服务。
 */
public interface IExamAnswerService {

    /**
     * 查询本人可参加的在线笔试。
     *
     * @param studentUserId 学生用户 ID
     * @param roundId       轮次 ID，可为空
     * @return 试卷列表
     */
    List<StudentExamListVO> listStudentExams(Long studentUserId, Long roundId);

    /**
     * 查看试卷与本人作答。
     *
     * @param studentUserId 学生用户 ID
     * @param paperId       试卷 ID
     * @return 答题详情
     */
    StudentExamDetailVO getStudentExam(Long studentUserId, Long paperId);

    /**
     * 开始答题，重复调用返回已有答卷。
     *
     * @param studentUserId 学生用户 ID
     * @param paperId       试卷 ID
     * @return 答题详情
     */
    StudentExamDetailVO startExam(Long studentUserId, Long paperId);

    /**
     * 暂存作答。
     *
     * @param studentUserId 学生用户 ID
     * @param paperId       试卷 ID
     * @param req           作答请求
     * @return 暂存结果
     */
    ExamSaveRespVO saveAnswers(Long studentUserId, Long paperId, ExamAnswerSaveReqDTO req);

    /**
     * 交卷并自动判分。
     *
     * @param studentUserId 学生用户 ID
     * @param paperId       试卷 ID
     * @return 判分结果
     */
    ExamSubmitRespVO submitExam(Long studentUserId, Long paperId);

    /**
     * 扫描并自动提交超时答卷。
     */
    void autoSubmitExpired();
}
