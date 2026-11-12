package com.college.labselect.dto.req;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 递补顺位调整项。
 */
@Data
public class WaitlistRankItemReqDTO {

    @NotNull(message = "递补记录 ID 不能为空")
    private Long waitlistId;

    @NotNull(message = "新顺位不能为空")
    @Min(value = 1, message = "顺位必须从 1 开始")
    private Integer rankNo;
}
