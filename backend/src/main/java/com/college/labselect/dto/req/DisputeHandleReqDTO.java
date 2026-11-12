package com.college.labselect.dto.req;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 处理异议请求，字段对齐 04_API.md §3.36。
 */
@Data
public class DisputeHandleReqDTO {

    @NotNull(message = "处理结果不能为空")
    @Min(value = 1, message = "处理结果取值 1-3")
    @Max(value = 3, message = "处理结果取值 1-3")
    private Integer handleResult;

    @NotBlank(message = "处理意见不能为空")
    @Size(max = 1000, message = "处理意见最长 1000 字")
    private String handleOpinion;

    private Long adjustMentorId;
}
