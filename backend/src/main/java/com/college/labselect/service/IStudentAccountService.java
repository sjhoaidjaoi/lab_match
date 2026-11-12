package com.college.labselect.service;

import com.college.labselect.common.PageResult;
import com.college.labselect.dto.req.StudentCreateReqDTO;
import com.college.labselect.dto.req.StudentStatusReqDTO;
import com.college.labselect.dto.req.StudentUpdateReqDTO;
import com.college.labselect.dto.resp.StudentImportResultVO;
import com.college.labselect.dto.resp.StudentListVO;
import org.springframework.web.multipart.MultipartFile;

/**
 * 学生账号管理服务。
 */
public interface IStudentAccountService {

    /**
     * 管理端分页查询学生账号。
     *
     * @param keyword  学号或姓名关键词
     * @param status   账号状态
     * @param pageNum  页码
     * @param pageSize 每页条数
     * @return 分页结果
     */
    PageResult<StudentListVO> pageStudents(String keyword, Integer status, long pageNum, long pageSize);

    /**
     * 新增学生账号并生成学生档案。
     *
     * @param req 新增请求
     * @return 学生用户 ID
     */
    Long createStudent(StudentCreateReqDTO req);

    /**
     * 编辑学生账号。
     *
     * @param id  学生用户 ID
     * @param req 修改请求
     */
    void updateStudent(Long id, StudentUpdateReqDTO req);

    /**
     * 启用 / 禁用学生账号。
     *
     * @param id  学生用户 ID
     * @param req 状态请求
     */
    void updateStatus(Long id, StudentStatusReqDTO req);

    /**
     * 重置学生密码为系统初始密码并置需改密标记。
     *
     * @param id 学生用户 ID
     */
    void resetPassword(Long id);

    /**
     * 批量导入学生账号。
     *
     * @param file Excel 文件
     * @return 导入结果，含成功数、失败数与失败明细
     */
    StudentImportResultVO importStudents(MultipartFile file);
}
