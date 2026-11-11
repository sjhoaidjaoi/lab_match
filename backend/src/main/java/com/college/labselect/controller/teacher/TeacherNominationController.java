package com.college.labselect.controller.teacher;

import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.NominationSaveReqDTO;
import com.college.labselect.dto.resp.NominationItemVO;
import com.college.labselect.dto.resp.NominationSaveRespVO;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.INominationService;
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

import java.util.List;

/**
 * 导师端拟录取接口。
 */
@Tag(name = "导师-拟录取")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/teacher/nominations")
public class TeacherNominationController {

    private final INominationService nominationService;

    /**
     * 我的拟录取列表。
     *
     * @param loginUser 当前登录用户
     * @param roundId   轮次 ID
     * @return 拟录取列表
     */
    @Operation(summary = "我的拟录取列表")
    @GetMapping
    public Result<List<NominationItemVO>> listNominations(@AuthenticationPrincipal LoginUser loginUser,
                                                          @RequestParam(required = false) Long roundId) {
        return Result.success(nominationService.listMyNominations(requireLogin(loginUser), roundId));
    }

    /**
     * 保存 / 提交拟录取名单。
     *
     * @param loginUser 当前登录用户
     * @param req       拟录取请求
     * @return 名额占用结果
     */
    @Operation(summary = "保存/提交拟录取")
    @PostMapping
    public Result<NominationSaveRespVO> saveNomination(@AuthenticationPrincipal LoginUser loginUser,
                                                       @Valid @RequestBody NominationSaveReqDTO req) {
        return Result.success(nominationService.saveNomination(requireLogin(loginUser), req));
    }

    private Long requireLogin(LoginUser loginUser) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return loginUser.getUserId();
    }
}
