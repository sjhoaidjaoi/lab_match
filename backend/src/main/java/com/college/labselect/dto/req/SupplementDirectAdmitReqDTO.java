package com.college.labselect.dto.req;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 补录直接录入请求，字段对齐 04_API.md §3.45。
 */
@Data
public class SupplementDirectAdmitReqDTO {

    @NotNull(message = "轮次 ID 不能为空")
    private Long roundId;

    @NotNull(message = "学生 ID 不能为空")
    private Long studentId;

    @NotBlank(message = "直接录入理由不能为空")
    @Size(max = 500, message = "直接录入理由最长 500 字")
    private String reason;
}
