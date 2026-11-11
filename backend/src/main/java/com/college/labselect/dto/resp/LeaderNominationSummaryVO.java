package com.college.labselect.dto.resp;

import lombok.Data;

import java.util.List;

/**
 * 本室拟录取汇总，字段对齐 04_API.md §3.28。
 */
@Data
public class LeaderNominationSummaryVO {

    private Integer labQuota;
    private Integer quotaUsed;
    private Integer remainQuota;
    private Integer conflictCount;
    private List<LeaderNominationMentorVO> mentors;
    private List<LeaderNominationConflictVO> conflicts;
}
