package com.college.labselect.dto.resp;

import lombok.Data;

import java.util.List;

/**
 * 我的录取名单，字段对齐 01_PRD.md §5.3 我的录取名单页。
 */
@Data
public class AdmissionListVO {

    private Integer quota;
    private Integer confirmedCount;
    private Integer pendingCount;
    private Integer remainQuota;
    private List<AdmissionItemVO> items;
}
