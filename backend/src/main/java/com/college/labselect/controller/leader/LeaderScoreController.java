package com.college.labselect.controller.leader;

import com.college.labselect.common.PageResult;
import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.resp.InterviewScoreListVO;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.IInterviewScoreService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 负责人端面试评分汇总接口。
 */
@Tag(name = "负责人-面试评分汇总")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/leader/scores")
public class LeaderScoreController {

    private final IInterviewScoreService interviewScoreService;

    /**
     * 本室评分汇总列表，按学生与导师分别展示。
     *
     * @param loginUser 当前登录用户
     * @param roundId   轮次 ID
     * @param keyword   学号或姓名关键词
     * @param status    评分状态
     * @param pageNum   页码
     * @param pageSize  每页条数
     * @return 分页结果
     */
    @Operation(summary = "本室评分汇总列表")
    @GetMapping
    public Result<PageResult<InterviewScoreListVO>> pageScores(
            @AuthenticationPrincipal LoginUser loginUser,
            @RequestParam(required = false) Long roundId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer status,
            @RequestParam(defaultValue = "1") long pageNum,
            @RequestParam(defaultValue = "10") long pageSize) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return Result.success(interviewScoreService.pageScores(
                loginUser.getUserId(), roundId, keyword, status, pageNum, pageSize));
    }
}
