package com.college.labselect.controller.teacher;

import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.TakeReallocationReqDTO;
import com.college.labselect.dto.resp.ReallocationPoolVO;
import com.college.labselect.dto.resp.TakeReallocationRespVO;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.ISupplementService;
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
import org.springframework.web.bind.annotation.RestController;

/**
 * 导师端全院调剂池接口。
 */
@Tag(name = "导师-全院调剂池")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/teacher/reallocation-pool")
public class TeacherReallocationController {

    private final ISupplementService supplementService;

    /**
     * 全院调剂池列表。
     *
     * @param loginUser 当前登录用户
     * @param roundId   轮次 ID
     * @param keyword   关键词
     * @param pageNum   页码
     * @param pageSize  每页条数
     * @return 调剂池分页
     */
    @Operation(summary = "全院调剂池列表")
    @GetMapping
    public Result<ReallocationPoolVO> pool(@AuthenticationPrincipal LoginUser loginUser,
                                           @RequestParam(required = false) Long roundId,
                                           @RequestParam(required = false) String keyword,
                                           @RequestParam(defaultValue = "1") long pageNum,
                                           @RequestParam(defaultValue = "10") long pageSize) {
        return Result.success(supplementService.listTeacherPool(
                requireLogin(loginUser), roundId, keyword, pageNum, pageSize));
    }

    /**
     * 抢录池内学生。
     *
     * @param loginUser 当前登录用户
     * @param studentId 学生用户 ID
     * @param req       录入理由
     * @return 录取结果
     */
    @Operation(summary = "抢录池内学生")
    @PostMapping("/{studentId}/take")
    public Result<TakeReallocationRespVO> take(@AuthenticationPrincipal LoginUser loginUser,
                                               @PathVariable Long studentId,
                                               @Valid @RequestBody TakeReallocationReqDTO req) {
        return Result.success(supplementService.take(requireLogin(loginUser), studentId, req));
    }

    private Long requireLogin(LoginUser loginUser) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return loginUser.getUserId();
    }
}
