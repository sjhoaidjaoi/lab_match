package com.college.labselect.controller.leader;

import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.AutoScheduleReqDTO;
import com.college.labselect.dto.req.InterviewSessionSaveReqDTO;
import com.college.labselect.dto.resp.InterviewSessionVO;
import com.college.labselect.dto.resp.PublishScheduleRespVO;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.IInterviewSessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 负责人端面试场次接口。
 */
@Tag(name = "负责人-面试场次")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/leader/interview-sessions")
public class LeaderInterviewSessionController {

    private final IInterviewSessionService interviewSessionService;

    /**
     * 场次列表。
     *
     * @param loginUser 当前登录用户
     * @param roundId   轮次 ID
     * @return 场次列表
     */
    @Operation(summary = "场次列表")
    @GetMapping
    public Result<List<InterviewSessionVO>> listSessions(@AuthenticationPrincipal LoginUser loginUser,
                                                         @RequestParam(required = false) Long roundId) {
        return Result.success(interviewSessionService.listSessions(requireLogin(loginUser), roundId));
    }

    /**
     * 新增场次。
     *
     * @param loginUser 当前登录用户
     * @param req       新增请求
     * @return 场次 ID
     */
    @Operation(summary = "新增场次")
    @PostMapping
    public Result<Long> createSession(@AuthenticationPrincipal LoginUser loginUser,
                                      @Valid @RequestBody InterviewSessionSaveReqDTO req) {
        return Result.success(interviewSessionService.createSession(requireLogin(loginUser), req));
    }

    /**
     * 修改场次。
     *
     * @param loginUser 当前登录用户
     * @param id        场次 ID
     * @param req       修改请求
     * @return 统一响应
     */
    @Operation(summary = "修改场次")
    @PutMapping("/{id}")
    public Result<Void> updateSession(@AuthenticationPrincipal LoginUser loginUser,
                                      @PathVariable Long id,
                                      @Valid @RequestBody InterviewSessionSaveReqDTO req) {
        interviewSessionService.updateSession(requireLogin(loginUser), id, req);
        return Result.success();
    }

    /**
     * 删除场次。
     *
     * @param loginUser 当前登录用户
     * @param id        场次 ID
     * @return 统一响应
     */
    @Operation(summary = "删除场次")
    @DeleteMapping("/{id}")
    public Result<Void> deleteSession(@AuthenticationPrincipal LoginUser loginUser, @PathVariable Long id) {
        interviewSessionService.deleteSession(requireLogin(loginUser), id);
        return Result.success();
    }

    /**
     * 发布排期。
     *
     * @param loginUser 当前登录用户
     * @param req       发布请求
     * @return 发布结果
     */
    @Operation(summary = "发布排期")
    @PostMapping("/publish")
    public Result<PublishScheduleRespVO> publish(@AuthenticationPrincipal LoginUser loginUser,
                                                 @Valid @RequestBody AutoScheduleReqDTO req) {
        return Result.success(interviewSessionService.publish(requireLogin(loginUser), req.getRoundId()));
    }

    private Long requireLogin(LoginUser loginUser) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return loginUser.getUserId();
    }
}
