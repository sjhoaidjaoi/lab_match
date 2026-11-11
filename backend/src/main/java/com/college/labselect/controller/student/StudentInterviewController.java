package com.college.labselect.controller.student;

import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.resp.StudentInterviewVO;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.IInterviewScheduleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 学生端面试安排接口。
 */
@Tag(name = "学生-面试安排")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/student/interviews")
public class StudentInterviewController {

    private final IInterviewScheduleService interviewScheduleService;

    /**
     * 我的面试安排。
     *
     * @param loginUser 当前登录用户
     * @param roundId   轮次 ID
     * @return 面试安排
     */
    @Operation(summary = "我的面试安排")
    @GetMapping
    public Result<List<StudentInterviewVO>> listInterviews(@AuthenticationPrincipal LoginUser loginUser,
                                                           @RequestParam(required = false) Long roundId) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return Result.success(interviewScheduleService.listStudentInterviews(loginUser.getUserId(), roundId));
    }
}
