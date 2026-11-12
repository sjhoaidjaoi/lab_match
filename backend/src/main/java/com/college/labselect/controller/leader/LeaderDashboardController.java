package com.college.labselect.controller.leader;

import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.resp.LeaderDashboardVO;
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
 * 本室负责人工作台接口。
 */
@Tag(name = "负责人-工作台")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/leader/dashboard")
public class LeaderDashboardController {

    private final IDashboardService dashboardService;

    /**
     * 本室工作台聚合数据。
     *
     * @param loginUser 当前登录用户
     * @return 本室工作台数据
     */
    @Operation(summary = "本室工作台")
    @GetMapping
    public Result<LeaderDashboardVO> getDashboard(@AuthenticationPrincipal LoginUser loginUser) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return Result.success(dashboardService.getLeaderDashboard(loginUser.getUserId()));
    }
}
