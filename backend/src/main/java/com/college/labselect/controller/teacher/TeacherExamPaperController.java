package com.college.labselect.controller.teacher;

import com.college.labselect.common.PageResult;
import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.ExamPaperSaveReqDTO;
import com.college.labselect.dto.resp.ExamPaperDetailVO;
import com.college.labselect.dto.resp.ExamPaperListVO;
import com.college.labselect.dto.resp.ExamResultVO;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.IExamPaperService;
import com.college.labselect.service.IExamResultService;
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
 * 导师端在线试卷接口。
 */
@Tag(name = "导师-在线试卷")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/teacher/exam-papers")
public class TeacherExamPaperController {

    private final IExamPaperService examPaperService;
    private final IExamResultService examResultService;

    /**
     * 分页查询本人试卷。
     *
     * @param loginUser 当前登录用户
     * @param roundId   轮次 ID，可为空
     * @param keyword   标题关键词，可为空
     * @param status    状态，可为空
     * @param pageNum   页码
     * @param pageSize  每页条数
     * @return 分页结果
     */
    @Operation(summary = "分页查询本人试卷")
    @GetMapping
    public Result<PageResult<ExamPaperListVO>> page(@AuthenticationPrincipal LoginUser loginUser,
                                                    @RequestParam(required = false) Long roundId,
                                                    @RequestParam(required = false) String keyword,
                                                    @RequestParam(required = false) Integer status,
                                                    @RequestParam(defaultValue = "1") long pageNum,
                                                    @RequestParam(defaultValue = "10") long pageSize) {
        return Result.success(examPaperService.pagePapers(requireLogin(loginUser),
                roundId, keyword, status, pageNum, pageSize));
    }

    /**
     * 查看本人试卷详情。
     *
     * @param loginUser 当前登录用户
     * @param id        试卷 ID
     * @return 试卷详情
     */
    @Operation(summary = "查看本人试卷详情")
    @GetMapping("/{id}")
    public Result<ExamPaperDetailVO> detail(@AuthenticationPrincipal LoginUser loginUser,
                                            @PathVariable Long id) {
        return Result.success(examPaperService.getPaper(requireLogin(loginUser), id));
    }

    /**
     * 新建试卷草稿。
     *
     * @param loginUser 当前登录用户
     * @param req       试卷请求
     * @return 试卷详情
     */
    @Operation(summary = "新建在线试卷草稿")
    @PostMapping
    public Result<ExamPaperDetailVO> create(@AuthenticationPrincipal LoginUser loginUser,
                                            @Valid @RequestBody ExamPaperSaveReqDTO req) {
        return Result.success(examPaperService.createPaper(requireLogin(loginUser), req));
    }

    /**
     * 修改本人试卷草稿。
     *
     * @param loginUser 当前登录用户
     * @param id        试卷 ID
     * @param req       试卷请求
     * @return 试卷详情
     */
    @Operation(summary = "修改本人试卷草稿")
    @PutMapping("/{id}")
    public Result<ExamPaperDetailVO> update(@AuthenticationPrincipal LoginUser loginUser,
                                            @PathVariable Long id,
                                            @Valid @RequestBody ExamPaperSaveReqDTO req) {
        return Result.success(examPaperService.updatePaper(requireLogin(loginUser), id, req));
    }

    /**
     * 删除本人试卷草稿。
     *
     * @param loginUser 当前登录用户
     * @param id        试卷 ID
     * @return 空响应
     */
    @Operation(summary = "删除本人试卷草稿")
    @DeleteMapping("/{id}")
    public Result<Void> delete(@AuthenticationPrincipal LoginUser loginUser, @PathVariable Long id) {
        examPaperService.deletePaper(requireLogin(loginUser), id);
        return Result.success();
    }

    /**
     * 发布本人试卷。
     *
     * @param loginUser 当前登录用户
     * @param id        试卷 ID
     * @return 空响应
     */
    @Operation(summary = "发布本人试卷")
    @PostMapping("/{id}/publish")
    public Result<Void> publish(@AuthenticationPrincipal LoginUser loginUser, @PathVariable Long id) {
        examPaperService.publishPaper(requireLogin(loginUser), id);
        return Result.success();
    }

    /**
     * 分页查看本人试卷的参考与得分。
     *
     * @param loginUser 当前登录用户
     * @param id        试卷 ID
     * @param status    答卷状态，可为空
     * @param pageNum   页码
     * @param pageSize  每页条数
     * @return 分页结果
     */
    @Operation(summary = "查看本人试卷参考结果")
    @GetMapping("/{id}/results")
    public Result<PageResult<ExamResultVO>> results(@AuthenticationPrincipal LoginUser loginUser,
                                                    @PathVariable Long id,
                                                    @RequestParam(required = false) Integer status,
                                                    @RequestParam(defaultValue = "1") long pageNum,
                                                    @RequestParam(defaultValue = "10") long pageSize) {
        return Result.success(examResultService.pageResults(requireLogin(loginUser), id, status, pageNum, pageSize));
    }

    private Long requireLogin(LoginUser loginUser) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return loginUser.getUserId();
    }
}
