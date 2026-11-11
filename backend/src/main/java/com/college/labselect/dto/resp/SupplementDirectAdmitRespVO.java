package com.college.labselect.dto.resp;

import lombok.Data;

/**
 * 补录直接录入响应，字段对齐 04_API.md §3.45。
 */
@Data
public class SupplementDirectAdmitRespVO {

    private Long admissionId;
    private Integer status;
}
