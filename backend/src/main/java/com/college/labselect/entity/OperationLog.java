package com.college.labselect.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 操作日志实体，字段与 03_Database.md §3.20 operation_log 一一对应。
 */
@Data
@TableName("operation_log")
public class OperationLog {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    private Long operatorId;

    private String operatorName;

    private String bizType;

    private Long bizId;

    private String action;

    private String beforeValue;

    private String afterValue;

    private String reason;

    private String ip;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtModified;
}
