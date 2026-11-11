package com.college.labselect.controller.teacher;

import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.SupplementDirectAdmitReqDTO;
import com.college.labselect.dto.resp.SupplementDirectAdmitRespVO;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.ISupplementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 导师端补录直接录入接口。
 */
@Tag(name = "导师-补录直录")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/teacher/supplement")
public class TeacherSupplementController {

    private final ISupplementService supplementService;

    /**
     * 补录直接录入（免面试）。
     *
     * @param loginUser 当前登录用户
     * @param req       直接录入请求
     * @return 录取结果
     */
    @Operation(summary = "补录直接录入")
    @PostMapping("/direct-admit")
    public Result<SupplementDirectAdmitRespVO> directAdmit(@AuthenticationPrincipal LoginUser loginUser,
                                                           @Valid @RequestBody SupplementDirectAdmitReqDTO req) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return Result.success(supplementService.directAdmit(loginUser.getUserId(), req));
    }
}
