package com.labmatch.module.base.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class StageView {

    /** 0 未开始 / 1 宣讲 / 2 开放日 / 3 填报 / 4 面试 / 5 确认 / 6 补录 / 7 调剂 / 8 公示 */
    private int stage;
    private String name;
    /** 未开始 / 进行中 / 已结束 */
    private String status;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private Integer roundNo;
}
