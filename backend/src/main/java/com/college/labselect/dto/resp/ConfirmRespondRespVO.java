package com.college.labselect.dto.resp;

import lombok.Data;

/**
 * 待确认响应结果，字段对齐 04_API.md §3.42。
 */
@Data
public class ConfirmRespondRespVO {

    private Long id;
    private Integer status;
}
