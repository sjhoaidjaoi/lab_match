package com.college.labselect.dto.resp;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 发布排期结果。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PublishScheduleRespVO {

    private Integer sessionCount;
    private Integer studentCount;
    private Integer noticeCount;
}
