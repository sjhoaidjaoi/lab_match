package com.college.labselect.controller.leader;

import com.college.labselect.common.PageResult;
import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.LeaderReallocationReqDTO;
import com.college.labselect.dto.resp.LeaderReallocationRespVO;
import com.college.labselect.dto.resp.ReallocationCandidateVO;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.IReallocationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 负责人端本室内部调剂接口。
 */
@Tag(name = "负责人-本室调剂")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/leader/reallocation")
public class LeaderReallocationController {

    private final IReallocationService reallocationService;

    /**
     * 本室内部调剂候选。
     *
     * @param loginUser 当前登录用户
     * @param roundId   轮次 ID
     * @param pageNum   页码
     * @param pageSize  每页条数
     * @return 候选分页
     */
    @Operation(summary = "本室内部调剂候选")
    @GetMapping("/candidates")
    public Result<PageResult<ReallocationCandidateVO>> candidates(@AuthenticationPrincipal LoginUser loginUser,
                                                                  @RequestParam(required = false) Long roundId,
                                                                  @RequestParam(defaultValue = "1") long pageNum,
                                                                  @RequestParam(defaultValue = "10") long pageSize) {
        return Result.success(reallocationService.listLeaderCandidates(
                requireLogin(loginUser), roundId, pageNum, pageSize));
    }

    /**
     * 执行本室内部调剂。
     *
     * @param loginUser 当前登录用户
     * @param req       调剂请求
     * @return 调剂结果
     */
    @Operation(summary = "执行本室内部调剂")
    @PostMapping
    public Result<LeaderReallocationRespVO> reallocate(@AuthenticationPrincipal LoginUser loginUser,
                                                       @Valid @RequestBody LeaderReallocationReqDTO req) {
        return Result.success(reallocationService.reallocateInner(requireLogin(loginUser), req));
    }

    private Long requireLogin(LoginUser loginUser) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return loginUser.getUserId();
    }
}
