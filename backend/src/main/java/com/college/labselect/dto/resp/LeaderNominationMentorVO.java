package com.college.labselect.dto.resp;

import lombok.Data;

/**
 * 本室拟录取汇总中的导师行，字段对齐 04_API.md §3.28。
 */
@Data
public class LeaderNominationMentorVO {

    private Long mentorId;
    private String mentorName;
    private Integer quota;
    private Integer nominatedCount;
    private Integer submitStatus;
    private String submitStatusText;
}
