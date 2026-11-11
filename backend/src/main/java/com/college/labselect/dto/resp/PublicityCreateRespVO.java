package com.college.labselect.dto.resp;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 发起公示响应，字段对齐 04_API.md §3.35。
 */
@Data
public class PublicityCreateRespVO {

    private Long id;

    private LocalDateTime startTime;

    private LocalDateTime endTime;

    private Integer admissionCount;

    private Integer status;
}
