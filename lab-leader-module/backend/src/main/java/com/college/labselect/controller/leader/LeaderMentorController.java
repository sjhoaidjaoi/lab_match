package com.college.labselect.controller.leader;

import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.MentorQuotaReqDTO;
import com.college.labselect.dto.resp.MentorListVO;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.IMentorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 负责人端导师与名额接口。
 */
@Tag(name = "负责人-导师名额")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/leader/mentors")
public class LeaderMentorController {

    private final IMentorService mentorService;

    /**
     * 本室导师与名额。
     *
     * @param loginUser 当前登录用户
     * @return 导师列表
     */
    @Operation(summary = "本室导师与名额")
    @GetMapping
    public Result<List<MentorListVO>> listMentors(@AuthenticationPrincipal LoginUser loginUser) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return Result.success(mentorService.listLeaderMentors(loginUser.getUserId()));
    }

    /**
     * 调整本室导师名额。
     *
     * @param loginUser 当前登录用户
     * @param id        导师档案 ID
     * @param req       调整请求
     * @return 统一响应
     */
    @Operation(summary = "调整本室导师名额")
    @PutMapping("/{id}/quota")
    public Result<Void> adjustQuota(@AuthenticationPrincipal LoginUser loginUser,
                                    @PathVariable Long id,
                                    @Valid @RequestBody MentorQuotaReqDTO req) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        mentorService.adjustQuotaByLeader(loginUser.getUserId(), id, req);
        return Result.success();
    }
}
