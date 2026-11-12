package com.college.labselect.controller.admin;

import com.college.labselect.common.PageResult;
import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.DisputeHandleReqDTO;
import com.college.labselect.dto.resp.DisputeHandleRespVO;
import com.college.labselect.dto.resp.DisputeItemVO;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.IDisputeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理员端异议处理接口。
 */
@Tag(name = "管理员-异议处理")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/disputes")
public class AdminDisputeController {

    private final IDisputeService disputeService;

    /**
     * 异议工单列表。
     *
     * @param status      状态
     * @param publicityId 公示批次 ID
     * @param pageNum     页码
     * @param pageSize    每页条数
     * @return 异议分页
     */
    @Operation(summary = "异议工单列表")
    @GetMapping
    public Result<PageResult<DisputeItemVO>> list(@RequestParam(required = false) Integer status,
                                                  @RequestParam(required = false) Long publicityId,
                                                  @RequestParam(defaultValue = "1") long pageNum,
                                                  @RequestParam(defaultValue = "10") long pageSize) {
        return Result.success(disputeService.listAdminDisputes(status, publicityId, pageNum, pageSize));
    }

    /**
     * 处理异议。
     *
     * @param loginUser 当前登录用户
     * @param id        工单 ID
     * @param req       处理请求
     * @return 处理结果
     */
    @Operation(summary = "处理异议")
    @PutMapping("/{id}/handle")
    public Result<DisputeHandleRespVO> handle(@AuthenticationPrincipal LoginUser loginUser,
                                              @PathVariable Long id,
                                              @Valid @RequestBody DisputeHandleReqDTO req) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return Result.success(disputeService.handleDispute(loginUser.getUserId(), id, req));
    }
}
