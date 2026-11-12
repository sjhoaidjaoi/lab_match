package com.college.labselect.dto.resp;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 轮次快照历史行，响应结构对齐 04_API.md §3.47.1。
 */
@Data
public class SnapshotListItemVO {

    private Long id;
    private Long roundId;
    private String roundName;
    private Integer snapshotType;
    private String snapshotTypeText;
    private Integer recordCount;
    private Integer version;
    private Integer isCurrent;
    private String operatorName;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime gmtCreate;
}
