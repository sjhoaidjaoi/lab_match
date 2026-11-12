package com.college.labselect.dto.req;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 生成轮次快照请求，字段对齐 04_API.md §3.47。
 */
@Data
public class SnapshotCreateReqDTO {

    @NotNull(message = "快照类型不能为空")
    @Min(value = 1, message = "快照类型不合法")
    @Max(value = 4, message = "快照类型不合法")
    private Integer snapshotType;
}
