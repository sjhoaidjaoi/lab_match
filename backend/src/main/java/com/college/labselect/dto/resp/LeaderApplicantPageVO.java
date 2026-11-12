package com.college.labselect.dto.resp;

import lombok.Data;

import java.util.List;

/**
 * 本室报名学生分页结果，填报截止前 visible = 0 且列表为空。
 */
@Data
public class LeaderApplicantPageVO {

    private Integer visible;
    private Long total;
    private Long pageNum;
    private Long pageSize;
    private List<LeaderApplicantVO> list;
}
