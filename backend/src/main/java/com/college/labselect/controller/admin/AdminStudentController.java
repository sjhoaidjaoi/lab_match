package com.college.labselect.controller.admin;

import com.college.labselect.common.PageResult;
import com.college.labselect.common.Result;
import com.college.labselect.dto.req.StudentCreateReqDTO;
import com.college.labselect.dto.req.StudentStatusReqDTO;
import com.college.labselect.dto.req.StudentUpdateReqDTO;
import com.college.labselect.dto.resp.StudentImportResultVO;
import com.college.labselect.dto.resp.StudentListVO;
import com.college.labselect.service.IStudentAccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * 管理端学生账号接口。
 */
@Tag(name = "管理-学生账号")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/students")
public class AdminStudentController {

    private final IStudentAccountService studentAccountService;

    /**
     * 学生账号列表。
     *
     * @param keyword  学号或姓名关键词
     * @param status   账号状态
     * @param pageNum  页码
     * @param pageSize 每页条数
     * @return 分页结果
     */
    @Operation(summary = "学生账号列表")
    @GetMapping
    public Result<PageResult<StudentListVO>> listStudents(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer status,
            @RequestParam(defaultValue = "1") long pageNum,
            @RequestParam(defaultValue = "10") long pageSize) {
        return Result.success(studentAccountService.pageStudents(keyword, status, pageNum, pageSize));
    }

    /**
     * 新增学生账号。
     *
     * @param req 新增请求
     * @return 学生用户 ID
     */
    @Operation(summary = "新增学生账号")
    @PostMapping
    public Result<Long> createStudent(@Valid @RequestBody StudentCreateReqDTO req) {
        return Result.success(studentAccountService.createStudent(req));
    }

    /**
     * 编辑学生账号。
     *
     * @param id  学生用户 ID
     * @param req 修改请求
     * @return 统一响应
     */
    @Operation(summary = "编辑学生账号")
    @PutMapping("/{id}")
    public Result<Void> updateStudent(@PathVariable Long id, @Valid @RequestBody StudentUpdateReqDTO req) {
        studentAccountService.updateStudent(id, req);
        return Result.success();
    }

    /**
     * 批量导入学生。
     *
     * @param file Excel 文件
     * @return 导入结果
     */
    @Operation(summary = "批量导入学生")
    @PostMapping("/import")
    public Result<StudentImportResultVO> importStudents(@RequestPart("file") MultipartFile file) {
        return Result.success(studentAccountService.importStudents(file));
    }

    /**
     * 重置学生密码。
     *
     * @param id 学生用户 ID
     * @return 统一响应
     */
    @Operation(summary = "重置学生密码")
    @PostMapping("/{id}/reset-password")
    public Result<Void> resetPassword(@PathVariable Long id) {
        studentAccountService.resetPassword(id);
        return Result.success();
    }

    /**
     * 启用 / 禁用学生。
     *
     * @param id  学生用户 ID
     * @param req 状态请求
     * @return 统一响应
     */
    @Operation(summary = "启用/禁用学生")
    @PutMapping("/{id}/status")
    public Result<Void> updateStatus(@PathVariable Long id, @Valid @RequestBody StudentStatusReqDTO req) {
        studentAccountService.updateStatus(id, req);
        return Result.success();
    }
}
