package com.college.labselect.controller.student;

import com.college.labselect.common.PageResult;
import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.NoticeReadReqDTO;
import com.college.labselect.dto.resp.NoticeItemVO;
import com.college.labselect.dto.resp.UnreadCountVO;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.INoticeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 学生端站内通知接口。
 */
@Tag(name = "学生-站内通知")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/student/notices")
public class StudentNoticeController {

    private final INoticeService noticeService;

    /**
     * 我的通知列表。
     *
     * @param loginUser  当前登录用户
     * @param isRead     已读状态
     * @param noticeType 通知类型
     * @param pageNum    页码
     * @param pageSize   每页条数
     * @return 通知分页
     */
    @Operation(summary = "我的通知列表")
    @GetMapping
    public Result<PageResult<NoticeItemVO>> list(@AuthenticationPrincipal LoginUser loginUser,
                                                 @RequestParam(required = false) Integer isRead,
                                                 @RequestParam(required = false) Integer noticeType,
                                                 @RequestParam(defaultValue = "1") long pageNum,
                                                 @RequestParam(defaultValue = "10") long pageSize) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return Result.success(noticeService.listNotices(loginUser.getUserId(), isRead, noticeType,
                pageNum, pageSize));
    }

    /**
     * 标记通知已读。
     *
     * @param loginUser 当前登录用户
     * @param req       已读请求
     * @return 空结果
     */
    @Operation(summary = "标记已读")
    @PutMapping("/read")
    public Result<Void> read(@AuthenticationPrincipal LoginUser loginUser,
                             @RequestBody NoticeReadReqDTO req) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        noticeService.markRead(loginUser.getUserId(), req);
        return Result.success(null);
    }

    /**
     * 未读通知数量。
     *
     * @param loginUser 当前登录用户
     * @return 未读数量
     */
    @Operation(summary = "未读数量")
    @GetMapping("/unread-count")
    public Result<UnreadCountVO> unreadCount(@AuthenticationPrincipal LoginUser loginUser) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return Result.success(noticeService.unreadCount(loginUser.getUserId()));
    }
}
