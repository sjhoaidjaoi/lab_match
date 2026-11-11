package com.college.labselect.dto.resp;

import lombok.Data;

import java.util.List;

/**
 * 全院调剂池响应，字段对齐 04_API.md §3.43。
 */
@Data
public class ReallocationPoolVO {

    private Long total;
    private Long pageNum;
    private Long pageSize;
    private Integer myRemainQuota;
    private List<ReallocationPoolItemVO> list;
}
