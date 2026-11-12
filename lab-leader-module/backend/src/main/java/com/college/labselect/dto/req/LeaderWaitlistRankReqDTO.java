package com.college.labselect.dto.req;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

/**
 * 负责人调整本室递补顺位请求。
 */
@Data
public class LeaderWaitlistRankReqDTO {

    @NotNull(message = "轮次 ID 不能为空")
    private Long roundId;

    @NotEmpty(message = "调整项不能为空")
    @Valid
    private List<WaitlistRankItemReqDTO> items;

    @NotBlank(message = "调整理由不能为空")
    private String adjustReason;
}
