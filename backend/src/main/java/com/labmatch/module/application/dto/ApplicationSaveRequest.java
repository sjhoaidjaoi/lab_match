package com.labmatch.module.application.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class ApplicationSaveRequest {

    @NotNull(message = "缺少周期")
    private Long cycleId;

    @NotNull(message = "缺少轮次")
    private Integer round;

    /** 平行意向：最多 3 个，不分先后 */
    private List<Long> mentorIds;

    /** 服从实训室内部调剂 */
    private Boolean acceptL1;

    /** 服从全院跨实训室调剂 */
    private Boolean acceptL2;
}
