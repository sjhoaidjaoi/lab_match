package com.college.labselect.dto.req;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 公告新建 / 编辑请求，字段对齐 03_Database.md §3.14 notice。
 */
@Data
public class NoticeSaveReqDTO {

    @NotBlank(message = "公告标题不能为空")
    @Size(max = 200, message = "公告标题最长 200 字")
    private String title;

    @NotNull(message = "公告类型不能为空")
    @Min(value = 1, message = "公告类型不合法")
    @Max(value = 4, message = "公告类型不合法")
    private Integer noticeType;

    @NotBlank(message = "公告正文不能为空")
    private String content;

    @Size(max = 500, message = "附件地址最长 500 字符")
    private String attachmentUrl;

    /**
     * 新建时的初始状态：1 草稿 2 已发布；为空按草稿处理，编辑时忽略。
     */
    @Min(value = 1, message = "公告状态不合法")
    @Max(value = 2, message = "公告状态不合法")
    private Integer status;
}
