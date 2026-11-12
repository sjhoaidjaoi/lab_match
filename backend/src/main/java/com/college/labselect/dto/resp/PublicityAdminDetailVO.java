package com.college.labselect.dto.resp;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 管理员公示名单明细，响应结构对齐 04_API.md §3.35.1。
 */
@Data
public class PublicityAdminDetailVO {

    private Long id;
    private String title;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime startTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime endTime;

    private Integer status;
    private Integer total;
    private List<PublicityAdminRowVO> list;
}
