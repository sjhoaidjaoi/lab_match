package com.college.labselect.controller.publicapi;

import com.college.labselect.common.PageResult;
import com.college.labselect.common.Result;
import com.college.labselect.dto.resp.LabDetailVO;
import com.college.labselect.dto.resp.LabListVO;
import com.college.labselect.dto.resp.LabMentorVO;
import com.college.labselect.service.ILabService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 公共端实训室接口。
 */
@Tag(name = "公共-实训室")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/public")
public class PublicLabController {

    private final ILabService labService;

    /**
     * 实训室列表。
     *
     * @param keyword    名称关键词
     * @param department 所属系部
     * @param status     状态
     * @param pageNum    页码
     * @param pageSize   每页条数
     * @return 分页结果
     */
    @Operation(summary = "实训室列表")
    @GetMapping("/labs")
    public Result<PageResult<LabListVO>> listLabs(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) Integer status,
            @RequestParam(defaultValue = "1") long pageNum,
            @RequestParam(defaultValue = "12") long pageSize) {
        return Result.success(labService.pagePublicLabs(keyword, department, status, pageNum, pageSize));
    }

    /**
     * 实训室详情。
     *
     * @param id 实训室 ID
     * @return 实训室详情
     */
    @Operation(summary = "实训室详情")
    @GetMapping("/labs/{id}")
    public Result<LabDetailVO> getLabDetail(@PathVariable Long id) {
        return Result.success(labService.getPublicLabDetail(id));
    }

    /**
     * 导师详情。
     *
     * @param id 导师档案 ID
     * @return 导师简要信息
     */
    @Operation(summary = "导师详情")
    @GetMapping("/mentors/{id}")
    public Result<LabMentorVO> getMentor(@PathVariable Long id) {
        return Result.success(labService.getPublicMentor(id));
    }
}
