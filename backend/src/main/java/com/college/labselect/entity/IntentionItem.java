package com.college.labselect.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 意向明细实体，字段与 03_Database.md §3.6 intention_item 一一对应。
 */
@Data
@TableName("intention_item")
public class IntentionItem {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    private Long intentionId;

    private Long mentorId;

    private Long labId;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtModified;
}
