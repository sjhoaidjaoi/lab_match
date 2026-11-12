package com.college.labselect.controller.leader;

import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.LeaderNominationAdjustReqDTO;
import com.college.labselect.dto.req.LeaderNominationSubmitReqDTO;
import com.college.labselect.dto.resp.LeaderNominationDetailVO;
import com.college.labselect.dto.resp.LeaderNominationSubmitRespVO;
import com.college.labselect.dto.resp.LeaderNominationSummaryVO;
import com.college.labselect.dto.resp.NominationSaveRespVO;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.ILeaderNominationService;
import com.college.labselect.service.INominationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 负责人端本室拟录取汇总接口。
 */
@Tag(name = "负责人-拟录取汇总")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/leader/nominations")
public class LeaderNominationController {

    private final ILeaderNominationService leaderNominationService;
    private final INominationService nominationService;

    /**
     * 本室拟录取汇总。
     *
     * @param loginUser 当前登录用户
     * @param roundId   轮次 ID
     * @return 汇总结果
     */
    @Operation(summary = "本室拟录取汇总")
    @GetMapping
    public Result<LeaderNominationSummaryVO> summary(@AuthenticationPrincipal LoginUser loginUser,
                                                     @RequestParam(required = false) Long roundId) {
        return Result.success(leaderNominationService.summary(requireLogin(loginUser), roundId));
    }

    /**
     * 提交本室名单。
     *
     * @param loginUser 当前登录用户
     * @param req       提交请求
     * @return 生成录取数与冲突数
     */
    @Operation(summary = "提交本室名单")
    @PostMapping("/submit")
    public Result<LeaderNominationSubmitRespVO> submit(@AuthenticationPrincipal LoginUser loginUser,
                                                       @Valid @RequestBody LeaderNominationSubmitReqDTO req) {
        return Result.success(leaderNominationService.submit(requireLogin(loginUser), req.getRoundId()));
    }

    /**
     * 查看某导师拟录取名单与候选学生。
     *
     * @param loginUser 当前登录用户
     * @param mentorId  导师档案 ID
     * @param roundId   轮次 ID
     * @return 名单详情
     */
    @Operation(summary = "查看导师拟录取名单")
    @GetMapping("/{mentorId}")
    public Result<LeaderNominationDetailVO> mentorNominations(@AuthenticationPrincipal LoginUser loginUser,
                                                              @PathVariable Long mentorId,
                                                              @RequestParam(required = false) Long roundId) {
        return Result.success(nominationService.getLeaderMentorNominations(
                requireLogin(loginUser), mentorId, roundId));
    }

    /**
     * 调整某导师拟录取名单。
     *
     * @param loginUser 当前登录用户
     * @param mentorId  导师档案 ID
     * @param req       调整请求
     * @return 名额占用结果
     */
    @Operation(summary = "调整导师拟录取名单")
    @PutMapping("/{mentorId}")
    public Result<NominationSaveRespVO> adjustMentorNominations(
            @AuthenticationPrincipal LoginUser loginUser,
            @PathVariable Long mentorId,
            @Valid @RequestBody LeaderNominationAdjustReqDTO req) {
        return Result.success(nominationService.saveLeaderMentorNominations(
                requireLogin(loginUser), mentorId, req));
    }

    private Long requireLogin(LoginUser loginUser) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return loginUser.getUserId();
    }
}
