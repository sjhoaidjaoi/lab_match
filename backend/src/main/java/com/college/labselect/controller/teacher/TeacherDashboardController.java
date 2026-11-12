package com.college.labselect.controller.teacher;

import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.resp.TeacherDashboardVO;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.IDashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 导师工作台接口。
 */
@Tag(name = "导师-工作台")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/teacher/dashboard")
public class TeacherDashboardController {

    private final IDashboardService dashboardService;

    /**
     * 导师工作台聚合数据。
     *
     * @param loginUser 当前登录用户
     * @return 导师工作台数据
     */
    @Operation(summary = "导师工作台")
    @GetMapping
    public Result<TeacherDashboardVO> getDashboard(@AuthenticationPrincipal LoginUser loginUser) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return Result.success(dashboardService.getTeacherDashboard(loginUser.getUserId()));
    }
}
