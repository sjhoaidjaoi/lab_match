package com.college.labselect.dto.resp;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 批量调剂失败明细，用于 04_API.md §3.34 failList。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReallocationFailVO {

    private Long studentId;
    private String studentName;
    private String reason;
}
