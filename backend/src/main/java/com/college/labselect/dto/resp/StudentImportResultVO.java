package com.college.labselect.dto.resp;

import lombok.Data;

import java.util.List;

/**
 * 批量导入结果，学生导入对齐 04_API.md §3.32，教师导入对齐 §3.32.2。
 */
@Data
public class StudentImportResultVO {

    private Integer successCount;
    private Integer failCount;
    private List<FailItem> failList;
    private String failFileUrl;

    /**
     * 导入失败行明细。
     */
    @Data
    public static class FailItem {

        private Integer row;
        private String userNo;
        private String reason;
    }
}
