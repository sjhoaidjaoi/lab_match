package com.college.labselect.dto.resp;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 批次解锁响应，字段对齐 04_API.md §3.49。
 */
@Data
public class RoundUnlockRespVO {

    private Integer locked;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime unlockedAt;
}
