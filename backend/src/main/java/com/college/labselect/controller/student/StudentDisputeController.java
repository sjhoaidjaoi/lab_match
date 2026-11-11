package com.college.labselect.controller.student;

import com.college.labselect.common.PageResult;
import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.DisputeSubmitReqDTO;
import com.college.labselect.dto.resp.DisputeItemVO;
import com.college.labselect.dto.resp.DisputeSubmitRespVO;
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
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 学生端异议工单接口。
 */
@Tag(name = "学生-异议工单")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/student/disputes")
public class StudentDisputeController {

    private final IDisputeService disputeService;

    /**
     * 提交异议工单。
     *
     * @param loginUser 当前登录用户
     * @param req       提交请求
     * @return 工单号与状态
     */
    @Operation(summary = "提交异议")
    @PostMapping
    public Result<DisputeSubmitRespVO> submit(@AuthenticationPrincipal LoginUser loginUser,
                                              @Valid @RequestBody DisputeSubmitReqDTO req) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return Result.success(disputeService.submitDispute(loginUser.getUserId(), req));
    }

    /**
     * 我的异议列表。
     *
     * @param loginUser 当前登录用户
     * @param pageNum   页码
     * @param pageSize  每页条数
     * @return 异议分页
     */
    @Operation(summary = "我的异议列表")
    @GetMapping
    public Result<PageResult<DisputeItemVO>> list(@AuthenticationPrincipal LoginUser loginUser,
                                                  @RequestParam(defaultValue = "1") long pageNum,
                                                  @RequestParam(defaultValue = "10") long pageSize) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return Result.success(disputeService.listMyDisputes(loginUser.getUserId(), pageNum, pageSize));
    }

    /**
     * 我的异议详情。
     *
     * @param loginUser 当前登录用户
     * @param id        工单 ID
     * @return 异议详情
     */
    @Operation(summary = "我的异议详情")
    @GetMapping("/{id}")
    public Result<DisputeItemVO> detail(@AuthenticationPrincipal LoginUser loginUser,
                                        @PathVariable Long id) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return Result.success(disputeService.getMyDispute(loginUser.getUserId(), id));
    }
}
