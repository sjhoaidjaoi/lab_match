package com.college.labselect.dto.resp;

import lombok.Data;

/**
 * 抢录池内学生响应，字段对齐 04_API.md §3.44。
 */
@Data
public class TakeReallocationRespVO {

    private Long admissionId;
    private Long mentorId;
}
