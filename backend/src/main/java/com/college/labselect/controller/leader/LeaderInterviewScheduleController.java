package com.college.labselect.controller.leader;

import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.AutoScheduleReqDTO;
import com.college.labselect.dto.req.ScheduleAdjustReqDTO;
import com.college.labselect.dto.resp.InterviewScheduleVO;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.IInterviewScheduleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 负责人端面试排期接口。
 */
@Tag(name = "负责人-面试排期")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/leader/interview-schedules")
public class LeaderInterviewScheduleController {

    private final IInterviewScheduleService interviewScheduleService;

    /**
     * 排期列表。
     *
     * @param loginUser 当前登录用户
     * @param roundId   轮次 ID
     * @return 排期列表
     */
    @Operation(summary = "排期列表")
    @GetMapping
    public Result<List<InterviewScheduleVO>> listSchedules(@AuthenticationPrincipal LoginUser loginUser,
                                                           @RequestParam(required = false) Long roundId) {
        return Result.success(interviewScheduleService.listSchedules(requireLogin(loginUser), roundId));
    }

    /**
     * 自动分配排期。
     *
     * @param loginUser 当前登录用户
     * @param req       请求体
     * @return 统一响应
     */
    @Operation(summary = "自动分配排期")
    @PostMapping("/auto")
    public Result<Void> autoSchedule(@AuthenticationPrincipal LoginUser loginUser,
                                     @Valid @RequestBody AutoScheduleReqDTO req) {
        interviewScheduleService.autoSchedule(requireLogin(loginUser), req.getRoundId());
        return Result.success();
    }

    /**
     * 手工调整排期。
     *
     * @param loginUser 当前登录用户
     * @param req       调整请求
     * @return 统一响应
     */
    @Operation(summary = "手工调整排期")
    @PutMapping
    public Result<Void> adjustSchedules(@AuthenticationPrincipal LoginUser loginUser,
                                        @Valid @RequestBody ScheduleAdjustReqDTO req) {
        interviewScheduleService.adjustSchedules(requireLogin(loginUser), req);
        return Result.success();
    }

    private Long requireLogin(LoginUser loginUser) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return loginUser.getUserId();
    }
}
