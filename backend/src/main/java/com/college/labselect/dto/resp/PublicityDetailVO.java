package com.college.labselect.dto.resp;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 学生端公示详情，字段对齐 04_API.md §3.16。
 */
@Data
public class PublicityDetailVO {

    private Long id;

    private String title;

    private LocalDateTime startTime;

    private LocalDateTime endTime;

    private Integer status;

    private Integer canDispute;

    private List<PublicityRowVO> list;
}
