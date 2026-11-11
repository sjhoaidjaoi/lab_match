package com.college.labselect.dto.resp;

import lombok.Data;

/**
 * 保存 / 提交拟录取响应，字段对齐 04_API.md §3.20。
 */
@Data
public class NominationSaveRespVO {

    private Integer submittedCount;
    private Integer quota;
    private Integer quotaUsed;
    private Integer remainQuota;
}
