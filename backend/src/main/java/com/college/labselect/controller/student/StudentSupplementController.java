package com.college.labselect.controller.student;

import com.college.labselect.common.PageResult;
import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.resp.AvailableMentorVO;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.ISupplementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 学生端补录可选导师接口。
 */
@Tag(name = "学生-补录导师")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/student/supplement")
public class StudentSupplementController {

    private final ISupplementService supplementService;

    /**
     * 补录可选导师（仅剩余名额）。
     *
     * @param loginUser 当前登录用户
     * @return 可选导师分页
     */
    @Operation(summary = "补录可选导师")
    @GetMapping("/mentors")
    public Result<PageResult<AvailableMentorVO>> mentors(@AuthenticationPrincipal LoginUser loginUser) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return Result.success(supplementService.listSupplementMentors(loginUser.getUserId()));
    }
}
