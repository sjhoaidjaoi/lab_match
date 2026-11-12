package com.college.labselect.controller.admin;

import com.college.labselect.common.Result;
import com.college.labselect.dto.resp.QuotaOverviewVO;
import com.college.labselect.service.IMentorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 管理端名额总览接口。
 */
@Tag(name = "管理-名额")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/quotas")
public class AdminQuotaController {

    private final IMentorService mentorService;

    /**
     * 全院名额总览。
     *
     * @return 名额总览
     */
    @Operation(summary = "全院名额总览")
    @GetMapping
    public Result<List<QuotaOverviewVO>> quotaOverview() {
        return Result.success(mentorService.quotaOverview());
    }

    /**
     * 导出名额 Excel。
     *
     * @return Excel 文件
     */
    @Operation(summary = "导出名额 Excel")
    @GetMapping("/export")
    public ResponseEntity<byte[]> exportQuotas() {
        byte[] content = mentorService.exportQuotas();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=quotas.xlsx")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(content);
    }
}
