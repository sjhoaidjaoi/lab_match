package com.college.labselect.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 异议工单实体，字段与 03_Database.md §3.16 dispute 一一对应。
 */
@Data
@TableName("dispute")
public class Dispute {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    private Long publicityId;

    private Long studentId;

    private Integer disputeType;

    private String content;

    private String attachmentUrl;

    private Integer status;

    private Long handlerId;

    private Integer handleResult;

    private String handleOpinion;

    private LocalDateTime handleTime;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtModified;
}
