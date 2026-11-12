package com.college.labselect.dto.req;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * 阶段内调整录取请求，字段对齐 04_API.md §3.46。
 */
@Data
public class AdmissionAdjustReqDTO {

    @NotBlank(message = "调整动作不能为空")
    @Pattern(regexp = "CONFIRM|CANCEL|REASSIGN|ABANDON",
            message = "调整动作仅支持 CONFIRM / CANCEL / REASSIGN / ABANDON")
    private String action;

    private Long targetMentorId;

    @NotBlank(message = "调整原因不能为空")
    private String reason;
}
