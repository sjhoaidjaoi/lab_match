package com.college.labselect.dto.req;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

/**
 * 管理员执行调剂请求，字段对齐 04_API.md §3.34。
 */
@Data
public class AdminReallocationReqDTO {

    @NotNull(message = "轮次 ID 不能为空")
    private Long roundId;

    @NotNull(message = "调剂级别不能为空")
    @Min(value = 1, message = "调剂级别仅支持 1 内部调剂 2 跨室调剂 3 座谈安置")
    @Max(value = 3, message = "调剂级别仅支持 1 内部调剂 2 跨室调剂 3 座谈安置")
    private Integer level;

    @NotEmpty(message = "调剂学生不能为空")
    @Valid
    private List<AdminReallocationItemReqDTO> items;

    @Size(max = 500, message = "调剂说明最长 500 字")
    private String reason;
}
