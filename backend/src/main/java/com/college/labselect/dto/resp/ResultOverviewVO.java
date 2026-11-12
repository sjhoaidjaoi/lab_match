package com.college.labselect.dto.resp;

import com.college.labselect.common.PageResult;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 全院录取总览响应。
 *
 * <p>归档后（round.locked = 1）列表一律从 is_current = 1 且 snapshot_type = 4 的
 * 轮次快照渲染；归档前从实时 admission 渲染。</p>
 */
@Data
public class ResultOverviewVO {

    private Long roundId;

    private Integer archived;

    private Integer totalQuota;

    private Integer totalAdmitted;

    private Integer totalConfirmed;

    private Integer totalEnrolled;

    private BigDecimal saturationRate;

    private PageResult<ResultRowVO> page;
}
