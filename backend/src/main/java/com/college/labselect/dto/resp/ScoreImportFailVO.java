package com.college.labselect.dto.resp;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 评分导入失败明细，用于 04_API.md §3.27.2 failList。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScoreImportFailVO {

    private Integer rowNo;
    private String userNo;
    private String reason;
}
