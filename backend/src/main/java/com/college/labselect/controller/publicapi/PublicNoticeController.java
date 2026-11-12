package com.college.labselect.controller.publicapi;

import com.college.labselect.common.PageResult;
import com.college.labselect.common.Result;
import com.college.labselect.dto.resp.PublicNoticeVO;
import com.college.labselect.service.INoticeManageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 公共端公告接口，仅展示已发布公告。
 */
@Tag(name = "公共-公告")
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/public")
public class PublicNoticeController {

    private final INoticeManageService noticeManageService;

    /**
     * 公告列表。
     *
     * @param noticeType 公告类型
     * @param pageNum    页码
     * @param pageSize   每页条数
     * @return 公告分页
     */
    @Operation(summary = "公告列表")
    @GetMapping("/notices")
    public Result<PageResult<PublicNoticeVO>> list(@RequestParam(required = false) Integer noticeType,
                                                   @RequestParam(defaultValue = "1") long pageNum,
                                                   @RequestParam(defaultValue = "10") long pageSize) {
        return Result.success(noticeManageService.pagePublicNotices(noticeType, pageNum, pageSize));
    }

    /**
     * 公告详情。
     *
     * @param id 公告 ID
     * @return 公告详情
     */
    @Operation(summary = "公告详情")
    @GetMapping("/notices/{id}")
    public Result<PublicNoticeVO> detail(@PathVariable Long id) {
        return Result.success(noticeManageService.getPublicNotice(id));
    }
}
