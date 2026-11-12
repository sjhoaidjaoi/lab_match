package com.college.labselect.dto.resp;

import lombok.Data;

/**
 * 确认最终名单响应，字段对齐 04_API.md §3.37。
 */
@Data
public class PublicityConfirmRespVO {

    private Integer confirmedCount;

    private Integer status;
}
