package com.college.labselect.service;

import com.college.labselect.common.PageResult;
import com.college.labselect.dto.req.InterviewScoreSaveReqDTO;
import com.college.labselect.dto.resp.InterviewScoreListVO;
import com.college.labselect.dto.resp.InterviewScoreRespVO;
import com.college.labselect.dto.resp.TeacherScoreDetailVO;
import org.springframework.web.multipart.MultipartFile;

/**
 * 面试评分服务。
 */
public interface IInterviewScoreService {

    /**
     * 分页查询本室评分。
     *
     * @param leaderUserId 负责人用户 ID
     * @param roundId      轮次 ID
     * @param keyword      学号或姓名关键词
     * @param status       评分状态
     * @param pageNum      页码
     * @param pageSize     每页条数
     * @return 分页结果
     */
    PageResult<InterviewScoreListVO> pageScores(Long leaderUserId, Long roundId, String keyword,
                                                Integer status, long pageNum, long pageSize);

    /**
     * 录入 / 更新评分。
     *
     * @param leaderUserId 负责人用户 ID
     * @param req          评分请求
     * @return 评分结果
     */
    InterviewScoreRespVO saveScore(Long leaderUserId, InterviewScoreSaveReqDTO req);

    /**
     * Excel 批量导入评分。
     *
     * @param leaderUserId 负责人用户 ID
     * @param file         Excel 文件
     */
    void importScores(Long leaderUserId, MultipartFile file);

    /**
     * 导师查看某学生本室评分。
     *
     * @param teacherUserId 教师用户 ID
     * @param studentId     学生用户 ID
     * @param roundId       轮次 ID
     * @return 评分详情
     */
    TeacherScoreDetailVO getTeacherScore(Long teacherUserId, Long studentId, Long roundId);
}
