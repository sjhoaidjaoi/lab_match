package com.college.labselect.dto.req;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 批量调剂明细，字段对齐 04_API.md §3.34 items。
 */
@Data
public class AdminReallocationItemReqDTO {

    @NotNull(message = "学生 ID 不能为空")
    private Long studentId;

    @NotNull(message = "目标导师 ID 不能为空")
    private Long toMentorId;
}
