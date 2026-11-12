package com.college.labselect.controller.teacher;

import com.college.labselect.common.PageResult;
import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.QuestionSaveReqDTO;
import com.college.labselect.dto.resp.QuestionVO;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.IQuestionService;
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

/**
 * 导师端题库接口，导师只管理本人题目。
 */
@Tag(name = "导师-题库")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/teacher/questions")
public class TeacherQuestionController {

    private final IQuestionService questionService;

    /**
     * 分页查询本人题库。
     *
     * @param loginUser    当前登录用户
     * @param questionType 题型，可为空
     * @param keyword      题干关键词，可为空
     * @param status       状态，可为空
     * @param pageNum      页码
     * @param pageSize     每页条数
     * @return 分页结果
     */
    @Operation(summary = "分页查询本人题库")
    @GetMapping
    public Result<PageResult<QuestionVO>> page(@AuthenticationPrincipal LoginUser loginUser,
                                               @RequestParam(required = false) Integer questionType,
                                               @RequestParam(required = false) String keyword,
                                               @RequestParam(required = false) Integer status,
                                               @RequestParam(defaultValue = "1") long pageNum,
                                               @RequestParam(defaultValue = "10") long pageSize) {
        return Result.success(questionService.pageQuestions(requireLogin(loginUser),
                questionType, keyword, status, pageNum, pageSize));
    }

    /**
     * 新增题目。
     *
     * @param loginUser 当前登录用户
     * @param req       题目请求
     * @return 题目详情
     */
    @Operation(summary = "新增题库题目")
    @PostMapping
    public Result<QuestionVO> create(@AuthenticationPrincipal LoginUser loginUser,
                                     @Valid @RequestBody QuestionSaveReqDTO req) {
        return Result.success(questionService.createQuestion(requireLogin(loginUser), req));
    }

    /**
     * 修改本人题目。
     *
     * @param loginUser 当前登录用户
     * @param id        题目 ID
     * @param req       题目请求
     * @return 题目详情
     */
    @Operation(summary = "修改本人题目")
    @PutMapping("/{id}")
    public Result<QuestionVO> update(@AuthenticationPrincipal LoginUser loginUser,
                                     @PathVariable Long id,
                                     @Valid @RequestBody QuestionSaveReqDTO req) {
        return Result.success(questionService.updateQuestion(requireLogin(loginUser), id, req));
    }

    /**
     * 删除或停用本人题目。
     *
     * @param loginUser 当前登录用户
     * @param id        题目 ID
     * @return 空响应
     */
    @Operation(summary = "删除或停用本人题目")
    @DeleteMapping("/{id}")
    public Result<Void> delete(@AuthenticationPrincipal LoginUser loginUser, @PathVariable Long id) {
        questionService.deleteQuestion(requireLogin(loginUser), id);
        return Result.success();
    }

    private Long requireLogin(LoginUser loginUser) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return loginUser.getUserId();
    }
}
