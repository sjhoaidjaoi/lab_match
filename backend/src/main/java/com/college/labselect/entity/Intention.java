package com.college.labselect.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 意向主表实体，字段与 03_Database.md §3.5 intention 一一对应。
 */
@Data
@TableName("intention")
public class Intention {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    private Long roundId;

    private Long studentId;

    private Integer acceptInnerAdjust;

    private Integer acceptCrossAdjust;

    private Integer poolConsent;

    private Integer status;

    private LocalDateTime submitTime;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtModified;
}
