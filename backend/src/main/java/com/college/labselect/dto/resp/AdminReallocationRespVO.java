package com.college.labselect.dto.resp;

import lombok.Data;

import java.util.List;

/**
 * 管理员批量调剂响应，字段对齐 04_API.md §3.34。
 */
@Data
public class AdminReallocationRespVO {

    private Integer successCount;
    private Integer failCount;
    private List<ReallocationFailVO> failList;
}
