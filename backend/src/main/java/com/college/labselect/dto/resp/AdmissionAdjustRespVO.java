package com.college.labselect.dto.resp;

import lombok.Data;

/**
 * 阶段内调整录取响应，字段对齐 04_API.md §3.46。
 */
@Data
public class AdmissionAdjustRespVO {

    private Long id;
    private Integer status;
    private Long mentorId;
}
