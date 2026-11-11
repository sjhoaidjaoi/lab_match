package com.college.labselect.dto.resp;

import lombok.Data;

/**
 * 公示名单行，字段对齐 04_API.md §3.16；不返回分数、评语等隐私字段。
 */
@Data
public class PublicityRowVO {

    private String studentNo;

    private String studentName;

    private String labName;

    private String mentorName;

    private Integer isSelf;
}
