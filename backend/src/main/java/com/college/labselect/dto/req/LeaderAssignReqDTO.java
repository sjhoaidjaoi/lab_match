package com.college.labselect.dto.req;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 提拔实训室负责人请求。
 */
@Data
public class LeaderAssignReqDTO {

    @NotNull(message = "负责人用户 ID 不能为空")
    private Long userId;

    @NotBlank(message = "提拔理由不能为空")
    private String reason;
}
