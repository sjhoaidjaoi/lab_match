package com.college.labselect.dto.resp;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 本室内部调剂响应，字段对齐 04_API.md §3.30。
 */
@Data
public class LeaderReallocationRespVO {

    private Long reallocationId;

    private Long admissionId;

    /**
     * 录取记录状态：1 待确认 2 已确认。
     */
    private Integer status;

    /**
     * 学生确认截止时间，直接生效时为空。
     */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime confirmDeadline;
}
