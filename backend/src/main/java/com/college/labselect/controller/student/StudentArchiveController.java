package com.college.labselect.controller.student;

import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.StudentArchiveSaveReqDTO;
import com.college.labselect.dto.resp.StudentArchiveRespVO;
import com.college.labselect.dto.resp.StudentArchiveSaveRespVO;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.IStudentArchiveService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 学生档案接口。
 */
@Tag(name = "学生-档案")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/student/archive")
public class StudentArchiveController {

    private final IStudentArchiveService studentArchiveService;

    /**
     * 我的档案。
     *
     * @param loginUser 当前登录用户
     * @return 档案详情
     */
    @Operation(summary = "我的档案")
    @GetMapping
    public Result<StudentArchiveRespVO> getArchive(@AuthenticationPrincipal LoginUser loginUser) {
        requireLogin(loginUser);
        return Result.success(studentArchiveService.getArchive(loginUser.getUserId()));
    }

    /**
     * 保存档案。
     *
     * @param loginUser 当前登录用户
     * @param req       保存请求
     * @return 缺失的必填项
     */
    @Operation(summary = "保存档案")
    @PutMapping
    public Result<StudentArchiveSaveRespVO> saveArchive(@AuthenticationPrincipal LoginUser loginUser,
                                                        @Valid @RequestBody StudentArchiveSaveReqDTO req) {
        requireLogin(loginUser);
        return Result.success(studentArchiveService.saveArchive(loginUser.getUserId(), req));
    }

    private void requireLogin(LoginUser loginUser) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
    }
}
