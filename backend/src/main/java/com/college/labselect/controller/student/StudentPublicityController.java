package com.college.labselect.controller.student;

import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.resp.PublicityDetailVO;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.IPublicityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 学生端公示名单接口。
 */
@Tag(name = "学生-公示名单")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/student/publicity")
public class StudentPublicityController {

    private final IPublicityService publicityService;

    /**
     * 查看公示名单，本人完整、他人脱敏。
     *
     * @param loginUser 当前登录用户
     * @param id        公示批次 ID
     * @return 公示详情
     */
    @Operation(summary = "公示名单")
    @GetMapping("/{id}")
    public Result<PublicityDetailVO> detail(@AuthenticationPrincipal LoginUser loginUser,
                                            @PathVariable Long id) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return Result.success(publicityService.getStudentPublicity(loginUser.getUserId(), id));
    }
}
