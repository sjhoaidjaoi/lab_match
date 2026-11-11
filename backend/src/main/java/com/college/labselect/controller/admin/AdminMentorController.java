package com.college.labselect.controller.admin;

import com.college.labselect.common.PageResult;
import com.college.labselect.common.Result;
import com.college.labselect.dto.req.MentorCreateReqDTO;
import com.college.labselect.dto.req.MentorQuotaReqDTO;
import com.college.labselect.dto.req.MentorStatusReqDTO;
import com.college.labselect.dto.req.MentorUpdateReqDTO;
import com.college.labselect.dto.resp.MentorListVO;
import com.college.labselect.service.IMentorService;
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
 * 管理端教师账号接口。
 */
@Tag(name = "管理-教师账号")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/mentors")
public class AdminMentorController {

    private final IMentorService mentorService;

    /**
     * 教师账号列表。
     *
     * @param labId    实训室 ID
     * @param keyword  工号或姓名关键词
     * @param status   状态
     * @param pageNum  页码
     * @param pageSize 每页条数
     * @return 分页结果
     */
    @Operation(summary = "教师账号列表")
    @GetMapping
    public Result<PageResult<MentorListVO>> listMentors(
            @RequestParam(required = false) Long labId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer status,
            @RequestParam(defaultValue = "1") long pageNum,
            @RequestParam(defaultValue = "10") long pageSize) {
        return Result.success(mentorService.pageAdminMentors(labId, keyword, status, pageNum, pageSize));
    }

    /**
     * 新增教师账号。
     *
     * @param req 新增请求
     * @return 导师档案 ID
     */
    @Operation(summary = "新增教师账号")
    @PostMapping
    public Result<Long> createMentor(@Valid @RequestBody MentorCreateReqDTO req) {
        return Result.success(mentorService.createMentor(req));
    }

    /**
     * 编辑教师账号。
     *
     * @param id  导师档案 ID
     * @param req 修改请求
     * @return 统一响应
     */
    @Operation(summary = "编辑教师账号")
    @PutMapping("/{id}")
    public Result<Void> updateMentor(@PathVariable Long id, @Valid @RequestBody MentorUpdateReqDTO req) {
        mentorService.updateMentor(id, req);
        return Result.success();
    }

    /**
     * 批量导入教师。
     *
     * @param file Excel 文件
     * @return 统一响应
     */
    @Operation(summary = "批量导入教师")
    @PostMapping("/import")
    public Result<Void> importMentors(@RequestPart("file") MultipartFile file) {
        mentorService.importMentors(file);
        return Result.success();
    }

    /**
     * 重置教师密码。
     *
     * @param id 导师档案 ID
     * @return 统一响应
     */
    @Operation(summary = "重置教师密码")
    @PostMapping("/{id}/reset-password")
    public Result<Void> resetPassword(@PathVariable Long id) {
        mentorService.resetPassword(id);
        return Result.success();
    }

    /**
     * 启用 / 禁用教师。
     *
     * @param id  导师档案 ID
     * @param req 状态请求
     * @return 统一响应
     */
    @Operation(summary = "启用/禁用教师")
    @PutMapping("/{id}/status")
    public Result<Void> updateStatus(@PathVariable Long id, @Valid @RequestBody MentorStatusReqDTO req) {
        mentorService.updateStatus(id, req);
        return Result.success();
    }

    /**
     * 管理员强制调整导师名额。
     *
     * @param id  导师档案 ID
     * @param req 调整请求
     * @return 统一响应
     */
    @Operation(summary = "强制调整导师名额")
    @PutMapping("/{id}/quota")
    public Result<Void> forceAdjustQuota(@PathVariable Long id, @Valid @RequestBody MentorQuotaReqDTO req) {
        mentorService.forceAdjustQuota(id, req);
        return Result.success();
    }
}
