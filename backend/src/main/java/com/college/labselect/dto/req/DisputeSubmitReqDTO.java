package com.college.labselect.dto.req;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

/**
 * 提交异议请求，字段对齐 04_API.md §3.15。
 */
@Data
public class DisputeSubmitReqDTO {

    @NotNull(message = "公示批次不能为空")
    private Long publicityId;

    @NotNull(message = "异议类型不能为空")
    @Min(value = 1, message = "异议类型取值 1-4")
    @Max(value = 4, message = "异议类型取值 1-4")
    private Integer disputeType;

    @NotBlank(message = "异议说明不能为空")
    @Size(max = 500, message = "异议说明最长 500 字")
    private String content;

    @Size(max = 3, message = "附件最多 3 个且地址合计不超过 1000 字符")
    private List<String> attachments;
}
