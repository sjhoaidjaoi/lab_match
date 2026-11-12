package com.college.labselect.controller.admin;

import com.college.labselect.common.PageResult;
import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.AdminReallocationReqDTO;
import com.college.labselect.dto.resp.AdminReallocationRespVO;
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
 * 管理员端三级统筹调剂接口。
 */
@Tag(name = "管理员-统筹调剂")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/reallocation")
public class AdminReallocationController {

    private final IReallocationService reallocationService;

    /**
     * 三级调剂候选。
     *
     * @param loginUser 当前登录用户
     * @param roundId   轮次 ID
     * @param level     调剂级别
     * @param pageNum   页码
     * @param pageSize  每页条数
     * @return 候选分页
     */
    @Operation(summary = "三级调剂候选")
    @GetMapping("/candidates")
    public Result<PageResult<ReallocationCandidateVO>> candidates(@AuthenticationPrincipal LoginUser loginUser,
                                                                  @RequestParam(required = false) Long roundId,
                                                                  @RequestParam Integer level,
                                                                  @RequestParam(defaultValue = "1") long pageNum,
                                                                  @RequestParam(defaultValue = "10") long pageSize) {
        return Result.success(reallocationService.listAdminCandidates(roundId, level, pageNum, pageSize));
    }

    /**
     * 执行调剂（支持批量）。
     *
     * @param loginUser 当前登录用户
     * @param req       调剂请求
     * @return 成功与失败明细
     */
    @Operation(summary = "执行调剂（支持批量）")
    @PostMapping
    public Result<AdminReallocationRespVO> reallocate(@AuthenticationPrincipal LoginUser loginUser,
                                                      @Valid @RequestBody AdminReallocationReqDTO req) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return Result.success(reallocationService.reallocateByAdmin(loginUser.getUserId(), req));
    }
}
