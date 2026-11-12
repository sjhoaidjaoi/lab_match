package com.college.labselect.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 站内通知实体，字段与 03_Database.md §3.17 user_notice 一一对应。
 */
@Data
@TableName("user_notice")
public class UserNotice {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    private Long userId;

    private String title;

    private String content;

    private Integer noticeType;

    private String bizType;

    private Long bizId;

    private Integer isRead;

    private LocalDateTime readTime;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtModified;
}
