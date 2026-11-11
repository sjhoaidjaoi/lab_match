package com.college.labselect.dto.req;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 发起公示请求，字段对齐 04_API.md §3.35。
 */
@Data
public class PublicityCreateReqDTO {

    @NotNull(message = "轮次不能为空")
    private Long roundId;

    @NotBlank(message = "公示标题不能为空")
    @Size(max = 200, message = "公示标题最长 200 字")
    private String title;

    @NotNull(message = "公示时长不能为空")
    @Min(value = 1, message = "公示时长至少 1 小时")
    @Max(value = 720, message = "公示时长最长 720 小时")
    private Integer durationHours = 24;
}
