package com.college.labselect.service;

import com.college.labselect.dto.resp.TeacherApplicantPageVO;
import com.college.labselect.dto.resp.TeacherStudentArchiveVO;

/**
 * 导师报名学生服务。
 */
public interface ITeacherApplicantService {

    /**
     * 查询报名本人意向的学生，填报截止前执行盲选门禁。
     *
     * @param teacherUserId   教师用户 ID
     * @param interviewStatus 面试状态筛选，可为空
     * @param scoreStatus     评分状态筛选，可为空
     * @param keyword         学号或姓名关键词，可为空
     * @param pageNum         页码
     * @param pageSize        每页条数
     * @return 报名学生分页
     */
    TeacherApplicantPageVO listApplicants(Long teacherUserId, Integer interviewStatus, Integer scoreStatus,
                                          String keyword, long pageNum, long pageSize);

    /**
     * 导师查看本人意向学生档案，学号姓名脱敏。
     *
     * @param teacherUserId 教师用户 ID
     * @param studentId     学生用户 ID
     * @return 学生档案，未创建档案时为 null
     */
    TeacherStudentArchiveVO getStudentArchive(Long teacherUserId, Long studentId);
}
