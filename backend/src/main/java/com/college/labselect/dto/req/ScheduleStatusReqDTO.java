package com.college.labselect.dto.req;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 面试排期状态登记请求，2 已完成、3 缺席。
 */
@Data
public class ScheduleStatusReqDTO {

    @NotNull(message = "面试状态不能为空")
    @Min(value = 2, message = "面试状态仅支持已完成或缺席")
    @Max(value = 3, message = "面试状态仅支持已完成或缺席")
    private Integer status;
}
