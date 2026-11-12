package com.college.labselect.dto.resp;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

/**
 * 工作台轮次摘要，按各端 04_API.md 工作台契约裁剪字段，未使用字段不序列化。
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DashboardRoundVO {

    private Integer roundNo;

    private String roundName;

    private Integer status;

    private String statusText;

    private Long countdownSeconds;
}
