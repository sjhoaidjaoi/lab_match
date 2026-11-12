package com.college.labselect.dto.req;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 批次解锁请求，字段对齐 04_API.md §3.49。
 */
@Data
public class RoundUnlockReqDTO {

    @NotBlank(message = "解锁原因不能为空")
    @Size(max = 500, message = "解锁原因最长 500 字")
    private String reason;

    @NotBlank(message = "管理员密码不能为空")
    private String confirmPassword;
}
