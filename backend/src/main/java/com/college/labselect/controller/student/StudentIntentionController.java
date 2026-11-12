package com.college.labselect.controller.student;

import com.college.labselect.common.PageResult;
import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.IntentionSaveReqDTO;
import com.college.labselect.dto.resp.AvailableMentorVO;
import com.college.labselect.dto.resp.IntentionRespVO;
import com.college.labselect.dto.resp.IntentionSaveRespVO;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.IIntentionService;
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
import org.springframework.web.bind.annotation.RestController;

/**
 * 学生意向填报接口。
 */
@Tag(name = "学生-意向填报")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/student")
public class StudentIntentionController {

    private final IIntentionService intentionService;

    /**
     * 查询我的填报。
     *
     * @param loginUser 当前登录用户
     * @param roundId   轮次 ID
     * @return 填报详情
     */
    @Operation(summary = "查询我的填报")
    @GetMapping("/intention")
    public Result<IntentionRespVO> getIntention(@AuthenticationPrincipal LoginUser loginUser,
                                                @RequestParam(required = false) Long roundId) {
        requireLogin(loginUser);
        return Result.success(intentionService.getIntention(loginUser.getUserId(), roundId));
    }

    /**
     * 保存 / 提交填报。
     *
     * @param loginUser 当前登录用户
     * @param req       保存请求
     * @return 填报 ID 与状态
     */
    @Operation(summary = "保存/提交填报")
    @PostMapping("/intention")
    public Result<IntentionSaveRespVO> saveIntention(@AuthenticationPrincipal LoginUser loginUser,
                                                     @Valid @RequestBody IntentionSaveReqDTO req) {
        requireLogin(loginUser);
        return Result.success(intentionService.saveIntention(loginUser.getUserId(), req));
    }

    /**
     * 可选导师列表。
     *
     * @param keyword       关键词
     * @param labId         实训室 ID
     * @param onlyAvailable 1 仅显示有剩余名额
     * @param pageNum       页码
     * @param pageSize      每页条数
     * @return 分页结果
     */
    @Operation(summary = "可选导师列表")
    @GetMapping("/mentors/available")
    public Result<PageResult<AvailableMentorVO>> availableMentors(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long labId,
            @RequestParam(defaultValue = "1") Integer onlyAvailable,
            @RequestParam(defaultValue = "1") long pageNum,
            @RequestParam(defaultValue = "10") long pageSize) {
        return Result.success(intentionService.pageAvailableMentors(keyword, labId, onlyAvailable, pageNum, pageSize));
    }

    private void requireLogin(LoginUser loginUser) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
    }
}
