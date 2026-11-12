package com.college.labselect.dto.req;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 公告发布 / 下线请求，状态取 03_Database.md §3.14：2 已发布 3 已下线。
 */
@Data
public class NoticeStatusReqDTO {

    @NotNull(message = "公告状态不能为空")
    @Min(value = 2, message = "公告状态不合法")
    @Max(value = 3, message = "公告状态不合法")
    private Integer status;
}
