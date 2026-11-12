package com.college.labselect.controller.leader;

import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.resp.LeaderApplicantPageVO;
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
 * 负责人端本室报名学生接口。
 */
@Tag(name = "负责人-报名学生")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/leader")
public class LeaderApplicantController {

    private final ITeacherApplicantService teacherApplicantService;

    /**
     * 本室报名学生列表。
     *
     * @param loginUser 当前登录用户
     * @param roundId   轮次 ID
     * @param keyword   学号或姓名关键词
     * @param pageNum   页码
     * @param pageSize  每页条数
     * @return 报名学生分页
     */
    @Operation(summary = "本室报名学生列表")
    @GetMapping("/applicants")
    public Result<LeaderApplicantPageVO> listApplicants(@AuthenticationPrincipal LoginUser loginUser,
                                                        @RequestParam(required = false) Long roundId,
                                                        @RequestParam(required = false) String keyword,
                                                        @RequestParam(defaultValue = "1") long pageNum,
                                                        @RequestParam(defaultValue = "10") long pageSize) {
        return Result.success(teacherApplicantService.listLeaderApplicants(
                requireLogin(loginUser), roundId, keyword, pageNum, pageSize));
    }

    /**
     * 本室报名学生档案。
     *
     * @param loginUser 当前登录用户
     * @param studentId 学生用户 ID
     * @param roundId   轮次 ID
     * @return 学生档案
     */
    @Operation(summary = "本室报名学生档案")
    @GetMapping("/students/{studentId}/archive")
    public Result<TeacherStudentArchiveVO> getStudentArchive(@AuthenticationPrincipal LoginUser loginUser,
                                                             @PathVariable Long studentId,
                                                             @RequestParam(required = false) Long roundId) {
        return Result.success(teacherApplicantService.getLeaderStudentArchive(
                requireLogin(loginUser), studentId, roundId));
    }

    private Long requireLogin(LoginUser loginUser) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return loginUser.getUserId();
    }
}
