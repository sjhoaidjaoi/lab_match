package com.college.labselect.dto.req;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 本室内部调剂请求，字段对齐 04_API.md §3.30。
 */
@Data
public class LeaderReallocationReqDTO {

    @NotNull(message = "轮次 ID 不能为空")
    private Long roundId;

    @NotNull(message = "学生 ID 不能为空")
    private Long studentId;

    @NotNull(message = "目标导师 ID 不能为空")
    private Long toMentorId;

    @NotBlank(message = "调剂说明不能为空")
    @Size(max = 500, message = "调剂说明最长 500 字")
    private String reason;
}
