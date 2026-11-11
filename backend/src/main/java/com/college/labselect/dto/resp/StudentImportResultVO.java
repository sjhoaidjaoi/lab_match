package com.college.labselect.dto.resp;

import lombok.Data;

import java.util.List;

/**
 * 学生批量导入结果，响应结构对齐 04_API.md §3.32。
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
