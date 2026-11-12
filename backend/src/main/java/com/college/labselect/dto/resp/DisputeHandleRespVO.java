package com.college.labselect.dto.resp;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 处理异议响应，字段对齐 04_API.md §3.36。
 */
@Data
public class DisputeHandleRespVO {

    private Long id;

    private Integer status;

    private LocalDateTime handleTime;
}
