package com.college.labselect.dto.resp;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 公示批次列表项，字段对齐 03_Database.md §3.15 与 flow/公示与异议.md。
 */
@Data
public class PublicityListVO {

    private Long id;

    private Long roundId;

    private String roundName;

    private String title;

    private LocalDateTime startTime;

    private LocalDateTime endTime;

    private Integer status;

    private String statusText;

    private Integer admissionCount;

    private Integer disputeCount;

    private Integer pendingDisputeCount;

    private Long remainSeconds;
}
