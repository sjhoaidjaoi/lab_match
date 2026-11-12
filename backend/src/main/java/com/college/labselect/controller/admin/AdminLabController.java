package com.college.labselect.controller.admin;

import com.college.labselect.common.PageResult;
import com.college.labselect.common.Result;
import com.college.labselect.dto.req.LabSaveReqDTO;
import com.college.labselect.dto.req.LeaderAssignReqDTO;
import com.college.labselect.dto.resp.LabListVO;
import com.college.labselect.service.ILabService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理端实训室接口。
 */
@Tag(name = "管理-实训室")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/labs")
public class AdminLabController {

    private final ILabService labService;

    /**
     * 实训室列表。
     *
     * @param keyword  名称关键词
     * @param status   状态
     * @param pageNum  页码
     * @param pageSize 每页条数
     * @return 分页结果
     */
    @Operation(summary = "实训室列表")
    @GetMapping
    public Result<PageResult<LabListVO>> listLabs(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer status,
            @RequestParam(defaultValue = "1") long pageNum,
            @RequestParam(defaultValue = "10") long pageSize) {
        return Result.success(labService.pageAdminLabs(keyword, status, pageNum, pageSize));
    }

    /**
     * 新建实训室。
     *
     * @param req 新增请求
     * @return 新实训室 ID
     */
    @Operation(summary = "新建实训室")
    @PostMapping
    public Result<Long> createLab(@Valid @RequestBody LabSaveReqDTO req) {
        return Result.success(labService.createLab(req));
    }

    /**
     * 修改实训室。
     *
     * @param id  实训室 ID
     * @param req 修改请求
     * @return 统一响应
     */
    @Operation(summary = "修改实训室")
    @PutMapping("/{id}")
    public Result<Void> updateLab(@PathVariable Long id, @Valid @RequestBody LabSaveReqDTO req) {
        labService.updateLab(id, req);
        return Result.success();
    }

    /**
     * 删除实训室。
     *
     * @param id 实训室 ID
     * @return 统一响应
     */
    @Operation(summary = "删除实训室")
    @DeleteMapping("/{id}")
    public Result<Void> deleteLab(@PathVariable Long id) {
        labService.deleteLab(id);
        return Result.success();
    }

    /**
     * 提拔负责人。
     *
     * @param id  实训室 ID
     * @param req 提拔请求
     * @return 统一响应
     */
    @Operation(summary = "提拔负责人")
    @PutMapping("/{id}/leader")
    public Result<Void> assignLeader(@PathVariable Long id, @Valid @RequestBody LeaderAssignReqDTO req) {
        labService.assignLeader(id, req);
        return Result.success();
    }
}
