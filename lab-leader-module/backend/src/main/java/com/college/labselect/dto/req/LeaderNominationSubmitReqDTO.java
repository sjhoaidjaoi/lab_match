package com.college.labselect.dto.req;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 提交本室名单请求，字段对齐 04_API.md §3.29。
 */
@Data
public class LeaderNominationSubmitReqDTO {

    @NotNull(message = "轮次 ID 不能为空")
    private Long roundId;
}
