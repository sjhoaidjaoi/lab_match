package com.college.labselect.dto.resp;

import lombok.Data;

/**
 * 生成轮次快照响应，字段对齐 04_API.md §3.47。
 */
@Data
public class SnapshotCreateRespVO {

    private Long id;

    private Integer version;

    private Integer recordCount;
}
