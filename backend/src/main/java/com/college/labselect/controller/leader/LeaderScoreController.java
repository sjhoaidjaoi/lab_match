package com.college.labselect.controller.leader;

import com.college.labselect.common.PageResult;
import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.InterviewScoreSaveReqDTO;
import com.college.labselect.dto.resp.InterviewScoreListVO;
import com.college.labselect.dto.resp.InterviewScoreRespVO;
import com.college.labselect.dto.resp.ScoreImportResultVO;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.IInterviewScoreService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * 负责人端面试评分接口。
 */
@Tag(name = "负责人-面试评分")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/leader/scores")
public class LeaderScoreController {

    private final IInterviewScoreService interviewScoreService;

    /**
     * 本室评分列表。
     *
     * @param loginUser 当前登录用户
     * @param roundId   轮次 ID
     * @param keyword   学号或姓名关键词
     * @param status    评分状态
     * @param pageNum   页码
     * @param pageSize  每页条数
     * @return 分页结果
     */
    @Operation(summary = "本室评分列表")
    @GetMapping
    public Result<PageResult<InterviewScoreListVO>> pageScores(
            @AuthenticationPrincipal LoginUser loginUser,
            @RequestParam(required = false) Long roundId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer status,
            @RequestParam(defaultValue = "1") long pageNum,
            @RequestParam(defaultValue = "10") long pageSize) {
        return Result.success(interviewScoreService.pageScores(
                requireLogin(loginUser), roundId, keyword, status, pageNum, pageSize));
    }

    /**
     * 录入 / 更新评分。
     *
     * @param loginUser 当前登录用户
     * @param req       评分请求
     * @return 评分结果
     */
    @Operation(summary = "录入/更新评分")
    @PostMapping
    public Result<InterviewScoreRespVO> saveScore(@AuthenticationPrincipal LoginUser loginUser,
                                                  @Valid @RequestBody InterviewScoreSaveReqDTO req) {
        return Result.success(interviewScoreService.saveScore(requireLogin(loginUser), req));
    }

    /**
     * Excel 批量导入评分。
     *
     * @param loginUser 当前登录用户
     * @param file      Excel 文件
     * @return 导入结果
     */
    @Operation(summary = "Excel 批量导入评分")
    @PostMapping("/import")
    public Result<ScoreImportResultVO> importScores(@AuthenticationPrincipal LoginUser loginUser,
                                                    @RequestPart("file") MultipartFile file) {
        return Result.success(interviewScoreService.importScores(requireLogin(loginUser), file));
    }

    private Long requireLogin(LoginUser loginUser) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return loginUser.getUserId();
    }
}
