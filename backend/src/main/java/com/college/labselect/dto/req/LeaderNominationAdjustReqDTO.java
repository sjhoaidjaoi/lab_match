package com.college.labselect.dto.req;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

/**
 * 负责人调整某导师拟录取名单请求。
 */
@Data
public class LeaderNominationAdjustReqDTO {

    @NotNull(message = "轮次 ID 不能为空")
    private Long roundId;

    @NotNull(message = "学生列表不能为空")
    private List<Long> studentIds;

    @NotBlank(message = "调整理由不能为空")
    @Size(max = 200, message = "调整理由不能超过 200 字")
    private String reason;
}
