package com.college.labselect.dto.resp;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 保存 / 提交填报响应。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class IntentionSaveRespVO {

    private Long id;
    private Integer status;
}
