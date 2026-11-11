package com.college.labselect.controller.teacher;

import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.InterviewScoreSaveReqDTO;
import com.college.labselect.dto.resp.InterviewScoreRespVO;
import com.college.labselect.dto.resp.ScoreImportResultVO;
import com.college.labselect.dto.resp.TeacherScoreDetailVO;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * 导师端评分接口，导师只操作选择本人的学生。
 */
@Tag(name = "导师-评分")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/teacher/scores")
public class TeacherScoreController {

    private final IInterviewScoreService interviewScoreService;

    /**
     * 查看某学生本人评分。
     *
     * @param loginUser 当前登录用户
     * @param studentId 学生用户 ID
     * @param roundId   轮次 ID
     * @return 评分详情
     */
    @Operation(summary = "查看某学生本人评分")
    @GetMapping("/{studentId}")
    public Result<TeacherScoreDetailVO> getScore(@AuthenticationPrincipal LoginUser loginUser,
                                                 @PathVariable Long studentId,
                                                 @RequestParam(required = false) Long roundId) {
        return Result.success(interviewScoreService.getTeacherScore(requireLogin(loginUser), studentId, roundId));
    }

    /**
     * 录入 / 更新本人评分。
     *
     * @param loginUser 当前登录用户
     * @param req       评分请求
     * @return 评分结果
     */
    @Operation(summary = "录入/更新本人评分")
    @PostMapping
    public Result<InterviewScoreRespVO> saveScore(@AuthenticationPrincipal LoginUser loginUser,
                                                  @Valid @RequestBody InterviewScoreSaveReqDTO req) {
        return Result.success(interviewScoreService.saveTeacherScore(requireLogin(loginUser), req));
    }

    /**
     * Excel 批量导入本人评分。
     *
     * @param loginUser 当前登录用户
     * @param file      Excel 文件
     * @return 导入结果
     */
    @Operation(summary = "Excel 批量导入本人评分")
    @PostMapping("/import")
    public Result<ScoreImportResultVO> importScores(@AuthenticationPrincipal LoginUser loginUser,
                                                    @RequestPart("file") MultipartFile file) {
        return Result.success(interviewScoreService.importTeacherScores(requireLogin(loginUser), file));
    }

    private Long requireLogin(LoginUser loginUser) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return loginUser.getUserId();
    }
}
