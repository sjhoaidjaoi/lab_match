package com.college.labselect.dto.req;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 启用 / 禁用教师请求。
 */
@Data
public class MentorStatusReqDTO {

    @NotNull(message = "状态不能为空")
    @Min(value = 0, message = "状态不合法")
    @Max(value = 1, message = "状态不合法")
    private Integer status;
}
