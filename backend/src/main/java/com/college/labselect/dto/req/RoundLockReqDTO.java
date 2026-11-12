package com.college.labselect.dto.req;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 批次锁定请求，字段对齐 04_API.md §3.48。
 */
@Data
public class RoundLockReqDTO {

    @NotBlank(message = "锁定原因不能为空")
    @Size(max = 500, message = "锁定原因最长 500 字")
    private String reason;
}
