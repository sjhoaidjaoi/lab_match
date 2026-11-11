package com.college.labselect.controller.teacher;

import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.ProfileUpdateReqDTO;
import com.college.labselect.dto.resp.ProfileRespVO;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.IProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 教师个人中心接口。
 */
@Tag(name = "教师-个人中心")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/teacher/profile")
public class TeacherProfileController {

    private final IProfileService profileService;

    /**
     * 查询个人信息。
     *
     * @param loginUser 当前登录用户
     * @return 个人信息
     */
    @Operation(summary = "导师个人信息")
    @GetMapping
    public Result<ProfileRespVO> getProfile(@AuthenticationPrincipal LoginUser loginUser) {
        return Result.success(profileService.getTeacherProfile(requireLogin(loginUser)));
    }

    /**
     * 修改个人信息。
     *
     * @param loginUser 当前登录用户
     * @param req       手机号与邮箱
     * @return 空结果
     */
    @Operation(summary = "修改个人信息")
    @PutMapping
    public Result<Void> updateProfile(@AuthenticationPrincipal LoginUser loginUser,
                                      @Valid @RequestBody ProfileUpdateReqDTO req) {
        profileService.updateTeacherProfile(requireLogin(loginUser), req);
        return Result.success(null);
    }

    private Long requireLogin(LoginUser loginUser) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return loginUser.getUserId();
    }
}
