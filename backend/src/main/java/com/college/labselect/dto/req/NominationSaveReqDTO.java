package com.college.labselect.dto.req;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

/**
 * 保存 / 提交拟录取请求，字段对齐 04_API.md §3.20。
 */
@Data
public class NominationSaveReqDTO {

    @NotNull(message = "轮次 ID 不能为空")
    private Long roundId;

    @NotEmpty(message = "学生列表不能为空")
    private List<Long> studentIds;

    @NotNull(message = "提交标记不能为空")
    private Integer submit;
}
