package com.college.labselect.dto.req;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 导师抢录池内学生请求，字段对齐 04_API.md §3.44。
 */
@Data
public class TakeReallocationReqDTO {

    @NotBlank(message = "录入理由不能为空")
    @Size(min = 10, max = 200, message = "录入理由需为 10-200 字")
    private String reason;
}
