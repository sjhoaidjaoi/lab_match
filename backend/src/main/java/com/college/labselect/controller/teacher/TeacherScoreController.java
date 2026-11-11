package com.college.labselect.controller.teacher;

import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.resp.TeacherScoreDetailVO;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.IInterviewScoreService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 导师端评分查询接口。
 */
@Tag(name = "导师-评分查询")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/teacher/scores")
public class TeacherScoreController {

    private final IInterviewScoreService interviewScoreService;

    /**
     * 查看某学生本室评分。
     *
     * @param loginUser 当前登录用户
     * @param studentId 学生用户 ID
     * @param roundId   轮次 ID
     * @return 评分详情
     */
    @Operation(summary = "查看某学生本室评分")
    @GetMapping("/{studentId}")
    public Result<TeacherScoreDetailVO> getScore(@AuthenticationPrincipal LoginUser loginUser,
                                                 @PathVariable Long studentId,
                                                 @RequestParam(required = false) Long roundId) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return Result.success(interviewScoreService.getTeacherScore(loginUser.getUserId(), studentId, roundId));
    }
}
