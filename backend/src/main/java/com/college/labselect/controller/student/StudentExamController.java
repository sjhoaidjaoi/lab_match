package com.college.labselect.controller.student;

import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.ExamAnswerSaveReqDTO;
import com.college.labselect.dto.resp.ExamSaveRespVO;
import com.college.labselect.dto.resp.ExamSubmitRespVO;
import com.college.labselect.dto.resp.StudentExamDetailVO;
import com.college.labselect.dto.resp.StudentExamListVO;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.IExamAnswerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 学生端在线笔试接口。
 */
@Tag(name = "学生-在线笔试")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/student/exams")
public class StudentExamController {

    private final IExamAnswerService examAnswerService;

    /**
     * 查询本人可参加的在线笔试。
     *
     * @param loginUser 当前登录用户
     * @param roundId   轮次 ID，可为空
     * @return 试卷列表
     */
    @Operation(summary = "我的在线笔试")
    @GetMapping
    public Result<List<StudentExamListVO>> list(@AuthenticationPrincipal LoginUser loginUser,
                                                @RequestParam(required = false) Long roundId) {
        return Result.success(examAnswerService.listStudentExams(requireLogin(loginUser), roundId));
    }

    /**
     * 查看试卷与本人作答。
     *
     * @param loginUser 当前登录用户
     * @param paperId   试卷 ID
     * @return 答题详情
     */
    @Operation(summary = "查看在线试卷")
    @GetMapping("/{paperId}")
    public Result<StudentExamDetailVO> detail(@AuthenticationPrincipal LoginUser loginUser,
                                              @PathVariable Long paperId) {
        return Result.success(examAnswerService.getStudentExam(requireLogin(loginUser), paperId));
    }

    /**
     * 开始答题。
     *
     * @param loginUser 当前登录用户
     * @param paperId   试卷 ID
     * @return 答题详情
     */
    @Operation(summary = "开始答题")
    @PostMapping("/{paperId}/start")
    public Result<StudentExamDetailVO> start(@AuthenticationPrincipal LoginUser loginUser,
                                             @PathVariable Long paperId) {
        return Result.success(examAnswerService.startExam(requireLogin(loginUser), paperId));
    }

    /**
     * 暂存作答。
     *
     * @param loginUser 当前登录用户
     * @param paperId   试卷 ID
     * @param req       作答请求
     * @return 暂存结果
     */
    @Operation(summary = "暂存作答")
    @PutMapping("/{paperId}/answers")
    public Result<ExamSaveRespVO> save(@AuthenticationPrincipal LoginUser loginUser,
                                       @PathVariable Long paperId,
                                       @Valid @RequestBody ExamAnswerSaveReqDTO req) {
        return Result.success(examAnswerService.saveAnswers(requireLogin(loginUser), paperId, req));
    }

    /**
     * 交卷并自动判分。
     *
     * @param loginUser 当前登录用户
     * @param paperId   试卷 ID
     * @return 判分结果
     */
    @Operation(summary = "交卷")
    @PostMapping("/{paperId}/submit")
    public Result<ExamSubmitRespVO> submit(@AuthenticationPrincipal LoginUser loginUser,
                                           @PathVariable Long paperId) {
        return Result.success(examAnswerService.submitExam(requireLogin(loginUser), paperId));
    }

    private Long requireLogin(LoginUser loginUser) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return loginUser.getUserId();
    }
}
