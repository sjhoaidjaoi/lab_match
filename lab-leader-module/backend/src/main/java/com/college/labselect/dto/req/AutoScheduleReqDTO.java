package com.college.labselect.dto.req;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 自动分配 / 发布排期请求。
 */
@Data
public class AutoScheduleReqDTO {

    @NotNull(message = "轮次 ID 不能为空")
    private Long roundId;
}
