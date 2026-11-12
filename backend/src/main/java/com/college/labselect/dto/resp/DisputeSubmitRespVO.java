package com.college.labselect.dto.resp;

import lombok.Data;

/**
 * 提交异议响应，字段对齐 04_API.md §3.15。
 */
@Data
public class DisputeSubmitRespVO {

    private Long id;

    private Integer status;
}
