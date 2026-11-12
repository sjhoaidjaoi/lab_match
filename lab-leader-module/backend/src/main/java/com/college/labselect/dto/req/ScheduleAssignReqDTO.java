package com.college.labselect.dto.req;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 拖拽排期请求：将未排期学生分配到草稿场次。
 */
@Data
public class ScheduleAssignReqDTO {

    @NotNull(message = "轮次 ID 不能为空")
    private Long roundId;

    @NotNull(message = "学生 ID 不能为空")
    private Long studentId;

    @NotNull(message = "导师 ID 不能为空")
    private Long mentorId;

    @NotNull(message = "场次 ID 不能为空")
    private Long sessionId;
}
