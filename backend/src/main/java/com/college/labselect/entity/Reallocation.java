package com.college.labselect.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 调剂记录实体，字段与 03_Database.md §3.13 reallocation 一一对应。
 */
@Data
@TableName("reallocation")
public class Reallocation {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    private Long roundId;

    private Long studentId;

    private Long fromLabId;

    private Long toLabId;

    private Long toMentorId;

    private Integer level;

    private Long operatorId;

    private String reason;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtModified;
}
