package com.college.labselect.dto.req;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 意向明细请求项。
 */
@Data
public class IntentionItemReqDTO {

    @NotNull(message = "导师 ID 不能为空")
    private Long mentorId;
}
