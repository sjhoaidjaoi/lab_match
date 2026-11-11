package com.college.labselect.controller.admin;

import com.college.labselect.common.Result;
import com.college.labselect.dto.resp.ResultOverviewVO;
import com.college.labselect.service.IArchiveService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理端全院录取总览接口。
 */
@Tag(name = "管理员-录取总览")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/results")
public class AdminResultController {

    private final IArchiveService archiveService;

    /**
     * 全院录取总览，归档后从最终归档快照渲染。
     *
     * @param roundId  轮次 ID
     * @param labId    实训室 ID
     * @param mentorId 导师档案 ID
     * @param keyword  学号或姓名关键词
     * @param status   录取状态
     * @param pageNum  页码
     * @param pageSize 每页条数
     * @return 总览统计与分页列表
     */
    @Operation(summary = "全院录取总览")
    @GetMapping
    public Result<ResultOverviewVO> overview(@RequestParam(required = false) Long roundId,
                                             @RequestParam(required = false) Long labId,
                                             @RequestParam(required = false) Long mentorId,
                                             @RequestParam(required = false) String keyword,
                                             @RequestParam(required = false) Integer status,
                                             @RequestParam(defaultValue = "1") long pageNum,
                                             @RequestParam(defaultValue = "10") long pageSize) {
        return Result.success(archiveService.resultOverview(roundId, labId, mentorId, keyword,
                status, pageNum, pageSize));
    }

    /**
     * 导出录取 Excel，归档后从最终归档快照渲染。
     *
     * @param roundId  轮次 ID
     * @param labId    实训室 ID
     * @param mentorId 导师档案 ID
     * @return Excel 文件
     */
    @Operation(summary = "导出录取 Excel")
    @GetMapping("/export")
    public ResponseEntity<byte[]> export(@RequestParam(required = false) Long roundId,
                                         @RequestParam(required = false) Long labId,
                                         @RequestParam(required = false) Long mentorId) {
        byte[] content = archiveService.exportResults(roundId, labId, mentorId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=results.xlsx")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(content);
    }
}
