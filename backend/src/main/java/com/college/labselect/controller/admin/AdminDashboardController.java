package com.college.labselect.controller.admin;

import com.college.labselect.common.Result;
import com.college.labselect.dto.resp.AdminDashboardVO;
import com.college.labselect.service.IDashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理员全院工作台接口。
 */
@Tag(name = "管理员-工作台")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/dashboard")
public class AdminDashboardController {

    private final IDashboardService dashboardService;

    /**
     * 全院工作台聚合数据。
     *
     * @return 全院工作台数据
     */
    @Operation(summary = "全院工作台")
    @GetMapping
    public Result<AdminDashboardVO> getDashboard() {
        return Result.success(dashboardService.getAdminDashboard());
    }
}
