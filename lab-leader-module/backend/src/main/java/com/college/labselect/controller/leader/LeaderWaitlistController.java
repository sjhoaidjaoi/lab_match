package com.college.labselect.controller.leader;

import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.LeaderWaitlistRankReqDTO;
import com.college.labselect.dto.resp.LeaderWaitlistItemVO;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.IWaitlistService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 负责人端本室递补名单接口。
 */
@Tag(name = "负责人-递补名单")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/leader/waitlist")
public class LeaderWaitlistController {

    private final IWaitlistService waitlistService;

    /**
     * 本室递补名单。
     *
     * @param loginUser 当前登录用户
     * @param roundId   轮次 ID
     * @return 本室递补名单
     */
    @Operation(summary = "本室递补名单")
    @GetMapping
    public Result<List<LeaderWaitlistItemVO>> listWaitlist(@AuthenticationPrincipal LoginUser loginUser,
                                                           @RequestParam(required = false) Long roundId) {
        return Result.success(waitlistService.listLeaderWaitlist(requireLogin(loginUser), roundId));
    }

    /**
     * 调整本室递补顺位。
     *
     * @param loginUser 当前登录用户
     * @param req       顺位调整请求
     * @return 统一响应
     */
    @Operation(summary = "调整本室递补顺位")
    @PutMapping("/rank")
    public Result<Void> adjustRank(@AuthenticationPrincipal LoginUser loginUser,
                                   @Valid @RequestBody LeaderWaitlistRankReqDTO req) {
        waitlistService.adjustLeaderRank(requireLogin(loginUser), req);
        return Result.success();
    }

    private Long requireLogin(LoginUser loginUser) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return loginUser.getUserId();
    }
}
