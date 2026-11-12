package com.college.labselect.controller.admin;

import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.AdmissionAdjustReqDTO;
import com.college.labselect.dto.resp.AdmissionAdjustRespVO;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.IReallocationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理员端阶段内调整录取接口。
 */
@Tag(name = "管理员-录取调整")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/admissions")
public class AdminAdmissionController {

    private final IReallocationService reallocationService;

    /**
     * 阶段内调整录取（确认 / 取消 / 改派 / 置放弃）。
     *
     * @param loginUser 当前登录用户
     * @param id        录取记录 ID
     * @param req       调整请求
     * @return 调整结果
     */
    @Operation(summary = "阶段内调整录取")
    @PostMapping("/{id}/adjust")
    public Result<AdmissionAdjustRespVO> adjust(@AuthenticationPrincipal LoginUser loginUser,
                                                @PathVariable Long id,
                                                @Valid @RequestBody AdmissionAdjustReqDTO req) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return Result.success(reallocationService.adjustAdmission(loginUser.getUserId(), id, req));
    }
}
