package com.college.labselect.dto.resp;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 我的填报详情。
 */
@Data
public class IntentionRespVO {

    private Long id;
    private Long roundId;
    private Integer roundNo;
    private Integer status;
    private String statusText;
    private Integer acceptInnerAdjust;
    private Integer acceptCrossAdjust;
    private Integer poolConsent;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime submitTime;

    private Integer editable;
    private List<IntentionItemVO> items;
}
