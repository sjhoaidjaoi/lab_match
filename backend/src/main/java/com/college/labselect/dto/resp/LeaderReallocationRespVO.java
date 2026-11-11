package com.college.labselect.dto.resp;

import lombok.Data;

/**
 * 本室内部调剂响应，字段对齐 04_API.md §3.30。
 */
@Data
public class LeaderReallocationRespVO {

    private Long reallocationId;
    private Long admissionId;
}
