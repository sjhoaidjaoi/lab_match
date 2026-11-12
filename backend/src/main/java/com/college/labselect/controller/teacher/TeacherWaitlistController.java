package com.college.labselect.controller.teacher;

import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.WaitlistRankReqDTO;
import com.college.labselect.dto.resp.WaitlistItemVO;
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
 * 导师端递补名单接口。
 */
@Tag(name = "导师-递补名单")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/teacher/waitlist")
public class TeacherWaitlistController {

    private final IWaitlistService waitlistService;

    /**
     * 我的递补名单。
     *
     * @param loginUser 当前登录用户
     * @param roundId   轮次 ID
     * @return 递补名单
     */
    @Operation(summary = "我的递补名单")
    @GetMapping
    public Result<List<WaitlistItemVO>> listWaitlist(@AuthenticationPrincipal LoginUser loginUser,
                                                     @RequestParam(required = false) Long roundId) {
        return Result.success(waitlistService.listWaitlist(requireLogin(loginUser), roundId));
    }

    /**
     * 调整递补顺位。
     *
     * @param loginUser 当前登录用户
     * @param req       顺位调整请求
     * @return 统一响应
     */
    @Operation(summary = "调整递补顺位")
    @PutMapping("/rank")
    public Result<Void> adjustRank(@AuthenticationPrincipal LoginUser loginUser,
                                   @Valid @RequestBody WaitlistRankReqDTO req) {
        waitlistService.adjustRank(requireLogin(loginUser), req);
        return Result.success();
    }

    private Long requireLogin(LoginUser loginUser) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return loginUser.getUserId();
    }
}
