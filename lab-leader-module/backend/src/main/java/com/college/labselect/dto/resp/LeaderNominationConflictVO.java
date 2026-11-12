package com.college.labselect.dto.resp;

import lombok.Data;

import java.util.List;

/**
 * 本室拟录取冲突项，字段对齐 04_API.md §3.28。
 */
@Data
public class LeaderNominationConflictVO {

    private Long studentId;
    private String studentName;
    private List<String> mentorNames;
    private String reason;
}
