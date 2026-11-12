package com.college.labselect.dto.resp;

import lombok.Data;

import java.util.List;

/**
 * 负责人查看某导师拟录取名单与候选学生。
 */
@Data
public class LeaderNominationDetailVO {

    private Long roundId;
    private Long mentorId;
    private String mentorName;
    private Integer quota;
    private Integer quotaUsed;
    private List<Long> selectedStudentIds;
    private List<LeaderNominationCandidateVO> candidates;
}
