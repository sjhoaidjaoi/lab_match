package com.college.labselect.dto.resp;

import lombok.Data;

import java.util.List;

/**
 * 录取待确认中心，字段对齐 04_API.md §3.41。
 */
@Data
public class ConfirmCenterVO {

    private Integer total;
    private List<ConfirmCenterItemVO> items;
}
