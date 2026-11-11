package com.college.labselect.dto.req;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

/**
 * 调整递补顺位请求，字段对齐 04_API.md §3.22。
 */
@Data
public class WaitlistRankReqDTO {

    @NotNull(message = "轮次 ID 不能为空")
    private Long roundId;

    @Valid
    @NotEmpty(message = "调整项不能为空")
    private List<WaitlistRankItemReqDTO> items;

    @NotBlank(message = "调整理由不能为空")
    private String adjustReason;
}
