package com.college.labselect.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 递补名单实体，字段与 03_Database.md §3.11 waitlist 一一对应。
 */
@Data
@TableName("waitlist")
public class Waitlist {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    private Long roundId;

    private Long mentorId;

    private Long studentId;

    private Integer rankNo;

    private Integer isManual;

    private String adjustReason;

    private Integer applyStatus;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtModified;
}
