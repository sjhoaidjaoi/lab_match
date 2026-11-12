package com.college.labselect.dto.resp;

import lombok.Data;

import java.util.List;

/**
 * 评分批量导入结果，字段对齐 04_API.md §3.27.2。
 */
@Data
public class ScoreImportResultVO {

    private Integer totalCount;
    private Integer successCount;
    private Integer failCount;
    private List<ScoreImportFailVO> failList;
}
