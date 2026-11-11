package com.college.labselect.dto.resp;

import lombok.Data;

/**
 * 学生工作台填报摘要中的意向后选。
 */
@Data
public class DashboardIntentionItemVO {

    private Long mentorId;

    private String mentorName;

    private String labName;
}
