package com.college.labselect.dto.req;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

/**
 * 手工调整排期请求。
 */
@Data
public class ScheduleAdjustReqDTO {

    @NotNull(message = "轮次 ID 不能为空")
    private Long roundId;

    @Valid
    @NotEmpty(message = "调整项不能为空")
    private List<ScheduleItemReqDTO> items;
}
