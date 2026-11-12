package com.college.labselect.dto.resp;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 批次锁定响应，字段对齐 04_API.md §3.48。
 */
@Data
public class RoundLockRespVO {

    private Integer locked;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime lockedAt;
}
