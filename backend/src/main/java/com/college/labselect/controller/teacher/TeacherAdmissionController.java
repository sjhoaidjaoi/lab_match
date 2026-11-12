package com.college.labselect.controller.teacher;

import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.resp.AdmissionListVO;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.IAdmissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 导师端录取名单接口。
 */
@Tag(name = "导师-录取名单")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/teacher/admissions")
public class TeacherAdmissionController {

    private final IAdmissionService admissionService;

    /**
     * 我的录取名单。
     *
     * @param loginUser 当前登录用户
     * @param roundId   轮次 ID
     * @return 录取名单
     */
    @Operation(summary = "我的录取名单")
    @GetMapping
    public Result<AdmissionListVO> listAdmissions(@AuthenticationPrincipal LoginUser loginUser,
                                                  @RequestParam(required = false) Long roundId) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return Result.success(admissionService.listTeacherAdmissions(loginUser.getUserId(), roundId));
    }

    /**
     * 发送确认提醒。
     *
     * @param loginUser 当前登录用户
     * @param id        录取记录 ID
     * @return 统一响应
     */
    @Operation(summary = "发送确认提醒")
    @PostMapping("/{id}/remind")
    public Result<Void> remind(@AuthenticationPrincipal LoginUser loginUser, @PathVariable Long id) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        admissionService.remind(loginUser.getUserId(), id);
        return Result.success();
    }
}
