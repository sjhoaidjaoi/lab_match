package com.college.labselect.dto.req;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 新建轮次请求。
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class RoundCreateReqDTO extends RoundBaseReqDTO {

    @NotNull(message = "轮次序号不能为空")
    @Min(value = 1, message = "轮次序号只能是 1-3")
    @Max(value = 3, message = "轮次序号只能是 1-3")
    private Integer roundNo;
}
