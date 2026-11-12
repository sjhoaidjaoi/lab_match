package com.college.labselect.dto.resp;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 异议工单视图，学生端仅返回本人、管理端返回全院；字段对齐 03_Database.md §3.16。
 */
@Data
public class DisputeItemVO {

    private Long id;

    private String disputeNo;

    private Long publicityId;

    private String publicityTitle;

    private Long studentId;

    private String studentNo;

    private String studentName;

    private Integer disputeType;

    private String disputeTypeText;

    private String content;

    private List<String> attachments;

    private Integer status;

    private String statusText;

    private Integer handleResult;

    private String handleResultText;

    private String handleOpinion;

    private Long handlerId;

    private String handlerName;

    private LocalDateTime handleTime;

    private LocalDateTime gmtCreate;
}
