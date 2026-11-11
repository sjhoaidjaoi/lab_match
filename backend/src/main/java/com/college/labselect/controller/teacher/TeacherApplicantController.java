package com.college.labselect.controller.teacher;

import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.resp.TeacherApplicantPageVO;
import com.college.labselect.dto.resp.TeacherStudentArchiveVO;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.ITeacherApplicantService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 导师端报名学生与档案查看接口。
 */
@Tag(name = "导师-报名学生")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/teacher")
public class TeacherApplicantController {

    private final ITeacherApplicantService teacherApplicantService;

    /**
     * 报名本人意向的学生列表。
     *
     * @param loginUser       当前登录用户
     * @param interviewStatus 面试状态
     * @param scoreStatus     评分状态
     * @param keyword         学号或姓名关键词
     * @param pageNum         页码
     * @param pageSize        每页条数
     * @return 报名学生分页
     */
    @Operation(summary = "报名学生列表")
    @GetMapping("/applicants")
    public Result<TeacherApplicantPageVO> applicants(@AuthenticationPrincipal LoginUser loginUser,
                                                     @RequestParam(required = false) Integer interviewStatus,
                                                     @RequestParam(required = false) Integer scoreStatus,
                                                     @RequestParam(required = false) String keyword,
                                                     @RequestParam(defaultValue = "1") long pageNum,
                                                     @RequestParam(defaultValue = "10") long pageSize) {
        return Result.success(teacherApplicantService.listApplicants(requireLogin(loginUser),
                interviewStatus, scoreStatus, keyword, pageNum, pageSize));
    }

    /**
     * 查看本人意向学生档案。
     *
     * @param loginUser 当前登录用户
     * @param studentId 学生用户 ID
     * @return 学生档案
     */
    @Operation(summary = "查看意向学生档案")
    @GetMapping("/students/{studentId}/archive")
    public Result<TeacherStudentArchiveVO> archive(@AuthenticationPrincipal LoginUser loginUser,
                                                   @PathVariable Long studentId) {
        return Result.success(teacherApplicantService.getStudentArchive(requireLogin(loginUser), studentId));
    }

    private Long requireLogin(LoginUser loginUser) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return loginUser.getUserId();
    }
}
