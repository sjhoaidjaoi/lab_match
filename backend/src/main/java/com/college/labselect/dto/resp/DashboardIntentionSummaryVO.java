package com.college.labselect.dto.resp;

import lombok.Data;

import java.util.List;

/**
 * 学生工作台填报摘要，字段对齐 04_API.md §3.6。
 */
@Data
public class DashboardIntentionSummaryVO {

    private Integer status;

    private List<DashboardIntentionItemVO> items;

    private Integer acceptInnerAdjust;

    private Integer acceptCrossAdjust;
}
