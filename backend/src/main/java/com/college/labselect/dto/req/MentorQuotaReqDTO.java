package com.college.labselect.dto.req;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 调整导师名额请求，负责人与管理员强制调整共用。
 */
@Data
public class MentorQuotaReqDTO {

    @NotNull(message = "新名额不能为空")
    @Min(value = 0, message = "新名额不能小于 0")
    private Integer quota;

    @NotBlank(message = "调整理由不能为空")
    private String reason;
}
