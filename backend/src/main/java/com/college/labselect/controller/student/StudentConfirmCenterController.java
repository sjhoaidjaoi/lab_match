package com.college.labselect.controller.student;

import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.ConfirmRespondReqDTO;
import com.college.labselect.dto.resp.ConfirmCenterVO;
import com.college.labselect.dto.resp.ConfirmRespondRespVO;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.IAdmissionService;
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
import org.springframework.web.bind.annotation.RestController;

/**
 * 学生端录取待确认中心接口。
 */
@Tag(name = "学生-录取待确认")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/student/confirm-center")
public class StudentConfirmCenterController {

    private final IAdmissionService admissionService;

    /**
     * 录取待确认中心。
     *
     * @param loginUser 当前登录用户
     * @return 待确认列表
     */
    @Operation(summary = "录取待确认中心")
    @GetMapping
    public Result<ConfirmCenterVO> confirmCenter(@AuthenticationPrincipal LoginUser loginUser) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return Result.success(admissionService.confirmCenter(loginUser.getUserId()));
    }

    /**
     * 接受 / 拒绝待确认记录。
     *
     * @param loginUser   当前登录用户
     * @param id          录取记录 ID
     * @param req         响应请求
     * @return 响应结果
     */
    @Operation(summary = "待确认响应")
    @PostMapping("/{id}/respond")
    public Result<ConfirmRespondRespVO> respond(@AuthenticationPrincipal LoginUser loginUser,
                                                @PathVariable Long id,
                                                @Valid @RequestBody ConfirmRespondReqDTO req) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return Result.success(admissionService.respond(loginUser.getUserId(), id, req));
    }
}
