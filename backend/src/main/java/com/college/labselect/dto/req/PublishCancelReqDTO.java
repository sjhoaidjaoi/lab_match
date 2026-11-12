package com.college.labselect.dto.req;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 取消发布并重排请求。
 */
@Data
public class PublishCancelReqDTO {

    @NotNull(message = "轮次 ID 不能为空")
    private Long roundId;

    @NotBlank(message = "取消原因不能为空")
    @Size(max = 200, message = "取消原因不能超过 200 字")
    private String reason;
}
