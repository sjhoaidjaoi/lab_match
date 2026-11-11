package com.college.labselect.dto.req;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 手工调整排期项。
 */
@Data
public class ScheduleItemReqDTO {

    @NotNull(message = "排期 ID 不能为空")
    private Long scheduleId;

    @NotNull(message = "目标场次不能为空")
    private Long sessionId;
}
