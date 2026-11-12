package com.college.labselect.service;

import com.college.labselect.common.PageResult;
import com.college.labselect.dto.resp.ExamResultVO;

/**
 * 导师查看在线笔试结果服务。
 */
public interface IExamResultService {

    /**
     * 分页查询本人试卷的参考与得分情况。
     *
     * @param teacherUserId 教师用户 ID
     * @param paperId       试卷 ID
     * @param status        答卷状态，可为空：0 未参加 1 答题中 2 已提交
     * @param pageNum       页码
     * @param pageSize      每页条数
     * @return 分页结果
     */
    PageResult<ExamResultVO> pageResults(Long teacherUserId, Long paperId, Integer status,
                                         long pageNum, long pageSize);
}
