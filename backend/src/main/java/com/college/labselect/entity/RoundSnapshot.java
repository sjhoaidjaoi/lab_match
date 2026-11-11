package com.college.labselect.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 轮次快照实体，字段与 03_Database.md §3.20 round_snapshot 一一对应。
 */
@Data
@TableName("round_snapshot")
public class RoundSnapshot {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    private Long roundId;

    private Integer snapshotType;

    private String content;

    private Integer recordCount;

    private Integer version;

    private Integer isCurrent;

    private Long operatorId;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtModified;
}
