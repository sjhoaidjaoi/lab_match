package com.college.labselect.dto.resp;

import lombok.Data;

import java.util.List;

/**
 * 导师报名学生分页响应，字段对齐 04_API.md §3.18。
 */
@Data
public class TeacherApplicantPageVO {

    private Integer visible;

    private Long total;

    private Long pageNum;

    private Long pageSize;

    private List<TeacherApplicantVO> list;
}
