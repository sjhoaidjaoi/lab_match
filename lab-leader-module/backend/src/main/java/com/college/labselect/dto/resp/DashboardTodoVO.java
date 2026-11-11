package com.college.labselect.dto.resp;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

/**
 * 工作台待办项，学生端携带数量与跳转地址，负责人端仅展示文案。
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DashboardTodoVO {

    private String type;

    private String text;

    private Integer count;

    private String target;
}
