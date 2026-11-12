package com.college.labselect.dto.req;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 开启 / 结束轮次请求。
 */
@Data
public class RoundStatusReqDTO {

    @NotNull(message = "轮次状态不能为空")
    @Min(value = 1, message = "轮次状态不合法")
    @Max(value = 5, message = "轮次状态不合法")
    private Integer status;
}
