package com.college.labselect.controller.admin;

import com.college.labselect.common.PageResult;
import com.college.labselect.common.Result;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.NoticeSaveReqDTO;
import com.college.labselect.dto.req.NoticeStatusReqDTO;
import com.college.labselect.dto.resp.NoticeAdminVO;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.INoticeManageService;
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

/**
 * 管理员端公告管理接口。
 */
@Tag(name = "管理员-公告管理")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/notices")
public class AdminNoticeController {

    private final INoticeManageService noticeManageService;

    /**
     * 公告列表。
     *
     * @param keyword    标题关键词
     * @param noticeType 公告类型
     * @param status     公告状态
     * @param pageNum    页码
     * @param pageSize   每页条数
     * @return 公告分页
     */
    @Operation(summary = "公告列表")
    @GetMapping
    public Result<PageResult<NoticeAdminVO>> list(@RequestParam(required = false) String keyword,
                                                  @RequestParam(required = false) Integer noticeType,
                                                  @RequestParam(required = false) Integer status,
                                                  @RequestParam(defaultValue = "1") long pageNum,
                                                  @RequestParam(defaultValue = "10") long pageSize) {
        return Result.success(noticeManageService.pageAdminNotices(keyword, noticeType, status, pageNum, pageSize));
    }

    /**
     * 新建公告。
     *
     * @param loginUser 当前登录用户
     * @param req       公告内容
     * @return 新建后的公告
     */
    @Operation(summary = "新建公告")
    @PostMapping
    public Result<NoticeAdminVO> create(@AuthenticationPrincipal LoginUser loginUser,
                                        @Valid @RequestBody NoticeSaveReqDTO req) {
        if (loginUser == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return Result.success(noticeManageService.createNotice(loginUser.getUserId(), req));
    }

    /**
     * 编辑公告。
     *
     * @param id  公告 ID
     * @param req 公告内容
     * @return 统一响应
     */
    @Operation(summary = "编辑公告")
    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @Valid @RequestBody NoticeSaveReqDTO req) {
        noticeManageService.updateNotice(id, req);
        return Result.success();
    }

    /**
     * 发布 / 下线公告。
     *
     * @param id  公告 ID
     * @param req 目标状态
     * @return 统一响应
     */
    @Operation(summary = "发布/下线公告")
    @PutMapping("/{id}/status")
    public Result<Void> updateStatus(@PathVariable Long id, @Valid @RequestBody NoticeStatusReqDTO req) {
        noticeManageService.updateStatus(id, req);
        return Result.success();
    }
}
