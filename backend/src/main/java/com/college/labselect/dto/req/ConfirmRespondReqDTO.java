package com.college.labselect.dto.req;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 待确认响应请求，字段对齐 04_API.md §3.42。
 */
@Data
public class ConfirmRespondReqDTO {

    @NotBlank(message = "操作类型不能为空")
    private String action;

    private String reason;
}
