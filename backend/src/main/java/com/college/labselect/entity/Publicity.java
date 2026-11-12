package com.college.labselect.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 公示批次实体，字段与 03_Database.md §3.15 publicity 一一对应。
 */
@Data
@TableName("publicity")
public class Publicity {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    private Long roundId;

    private String title;

    private LocalDateTime startTime;

    private LocalDateTime endTime;

    private Integer status;

    private Long publisherId;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtModified;
}
