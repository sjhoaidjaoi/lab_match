package com.college.labselect.controller.leader;

import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.resp.LeaderAdmissionSummaryVO;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.IAdmissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 负责人端本室录取确认与最终名单接口。
 */
@Tag(name = "负责人-录取名单")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/leader/admissions")
public class LeaderAdmissionController {

    private final IAdmissionService admissionService;

    /**
     * 本室录取确认汇总与名单。
     *
     * @param loginUser 当前登录用户
     * @param roundId   轮次 ID
     * @param finalOnly 是否仅返回已确认/已入组名单
     * @return 汇总与名单
     */
    @Operation(summary = "本室录取确认汇总")
    @GetMapping
    public Result<LeaderAdmissionSummaryVO> summary(@AuthenticationPrincipal LoginUser loginUser,
                                                    @RequestParam(required = false) Long roundId,
                                                    @RequestParam(defaultValue = "false") boolean finalOnly) {
        return Result.success(admissionService.listLeaderAdmissions(
                requireLogin(loginUser), roundId, finalOnly));
    }

    /**
     * 导出本室最终名单 Excel。
     *
     * @param loginUser 当前登录用户
     * @param roundId   轮次 ID
     * @return Excel 文件
     */
    @Operation(summary = "导出本室最终名单")
    @GetMapping("/export")
    public ResponseEntity<byte[]> export(@AuthenticationPrincipal LoginUser loginUser,
                                         @RequestParam(required = false) Long roundId) {
        byte[] content = admissionService.exportLeaderAdmissions(requireLogin(loginUser), roundId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=leader-results.xlsx")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(content);
    }

    private Long requireLogin(LoginUser loginUser) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return loginUser.getUserId();
    }
}
