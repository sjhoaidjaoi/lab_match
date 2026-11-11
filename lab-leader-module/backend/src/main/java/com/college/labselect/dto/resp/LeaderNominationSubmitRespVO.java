package com.college.labselect.dto.resp;

import lombok.Data;

/**
 * 提交本室名单响应，字段对齐 04_API.md §3.29。
 */
@Data
public class LeaderNominationSubmitRespVO {

    private Integer admissionCount;
    private Integer conflictCount;
}
