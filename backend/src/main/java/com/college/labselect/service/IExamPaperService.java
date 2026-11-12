package com.college.labselect.service;

import com.college.labselect.common.PageResult;
import com.college.labselect.dto.req.ExamPaperSaveReqDTO;
import com.college.labselect.dto.resp.ExamPaperDetailVO;
import com.college.labselect.dto.resp.ExamPaperListVO;

/**
 * 导师在线试卷服务。
 */
public interface IExamPaperService {

    /**
     * 分页查询本人试卷。
     *
     * @param teacherUserId 教师用户 ID
     * @param roundId       轮次 ID，可为空
     * @param keyword       标题关键词，可为空
     * @param status        状态，可为空
     * @param pageNum       页码
     * @param pageSize      每页条数
     * @return 分页结果
     */
    PageResult<ExamPaperListVO> pagePapers(Long teacherUserId, Long roundId, String keyword,
                                           Integer status, long pageNum, long pageSize);

    /**
     * 查看本人试卷详情。
     *
     * @param teacherUserId 教师用户 ID
     * @param id            试卷 ID
     * @return 试卷详情
     */
    ExamPaperDetailVO getPaper(Long teacherUserId, Long id);

    /**
     * 新建试卷草稿。
     *
     * @param teacherUserId 教师用户 ID
     * @param req           试卷请求
     * @return 试卷详情
     */
    ExamPaperDetailVO createPaper(Long teacherUserId, ExamPaperSaveReqDTO req);

    /**
     * 修改本人试卷草稿。
     *
     * @param teacherUserId 教师用户 ID
     * @param id            试卷 ID
     * @param req           试卷请求
     * @return 试卷详情
     */
    ExamPaperDetailVO updatePaper(Long teacherUserId, Long id, ExamPaperSaveReqDTO req);

    /**
     * 删除本人试卷草稿。
     *
     * @param teacherUserId 教师用户 ID
     * @param id            试卷 ID
     */
    void deletePaper(Long teacherUserId, Long id);

    /**
     * 发布本人试卷。
     *
     * @param teacherUserId 教师用户 ID
     * @param id            试卷 ID
     */
    void publishPaper(Long teacherUserId, Long id);
}
