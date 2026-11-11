package com.college.labselect.controller.admin;

import com.college.labselect.common.PageResult;
import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.PublicityCreateReqDTO;
import com.college.labselect.dto.resp.PublicityConfirmRespVO;
import com.college.labselect.dto.resp.PublicityCreateRespVO;
import com.college.labselect.dto.resp.PublicityListVO;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.IPublicityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理员端公示批次接口。
 */
@Tag(name = "管理员-公示管理")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/publicities")
public class AdminPublicityController {

    private final IPublicityService publicityService;

    /**
     * 公示批次列表。
     *
     * @param roundId  轮次 ID
     * @param status   公示状态
     * @param pageNum  页码
     * @param pageSize 每页条数
     * @return 公示批次分页
     */
    @Operation(summary = "公示批次列表")
    @GetMapping
    public Result<PageResult<PublicityListVO>> list(@RequestParam(required = false) Long roundId,
                                                    @RequestParam(required = false) Integer status,
                                                    @RequestParam(defaultValue = "1") long pageNum,
                                                    @RequestParam(defaultValue = "10") long pageSize) {
        return Result.success(publicityService.listPublicities(roundId, status, pageNum, pageSize));
    }

    /**
     * 发起公示。
     *
     * @param loginUser 当前登录用户
     * @param req       发起请求
     * @return 公示批次与名单人数
     */
    @Operation(summary = "发起公示")
    @PostMapping
    public Result<PublicityCreateRespVO> create(@AuthenticationPrincipal LoginUser loginUser,
                                                @Valid @RequestBody PublicityCreateReqDTO req) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return Result.success(publicityService.createPublicity(loginUser.getUserId(), req));
    }

    /**
     * 结束公示。
     *
     * @param loginUser 当前登录用户
     * @param id        公示批次 ID
     * @return 空结果
     */
    @Operation(summary = "结束公示")
    @PutMapping("/{id}/end")
    public Result<Void> end(@AuthenticationPrincipal LoginUser loginUser, @PathVariable Long id) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        publicityService.endPublicity(loginUser.getUserId(), id);
        return Result.success(null);
    }

    /**
     * 确认最终名单。
     *
     * @param loginUser 当前登录用户
     * @param id        公示批次 ID
     * @return 确认结果
     */
    @Operation(summary = "确认最终名单")
    @PostMapping("/{id}/confirm")
    public Result<PublicityConfirmRespVO> confirm(@AuthenticationPrincipal LoginUser loginUser,
                                                  @PathVariable Long id) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return Result.success(publicityService.confirmFinal(loginUser.getUserId(), id));
    }
}
