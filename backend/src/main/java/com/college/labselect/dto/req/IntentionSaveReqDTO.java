package com.college.labselect.dto.req;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

/**
 * 保存 / 提交填报请求。
 */
@Data
public class IntentionSaveReqDTO {

    @NotNull(message = "轮次 ID 不能为空")
    private Long roundId;

    @Valid
    @NotNull(message = "意向列表不能为空")
    private List<IntentionItemReqDTO> items;

    @NotNull(message = "内部调剂意愿不能为空")
    @Min(value = 0, message = "内部调剂意愿不合法")
    @Max(value = 1, message = "内部调剂意愿不合法")
    private Integer acceptInnerAdjust;

    @NotNull(message = "跨室调剂意愿不能为空")
    @Min(value = 0, message = "跨室调剂意愿不合法")
    @Max(value = 1, message = "跨室调剂意愿不合法")
    private Integer acceptCrossAdjust;

    @NotNull(message = "入池授权不能为空")
    @Min(value = 0, message = "入池授权不合法")
    @Max(value = 1, message = "入池授权不合法")
    private Integer poolConsent;

    @NotNull(message = "提交标记不能为空")
    @Min(value = 0, message = "提交标记不合法")
    @Max(value = 1, message = "提交标记不合法")
    private Integer submit;
}
