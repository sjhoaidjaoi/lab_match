package com.college.labselect.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 公告实体，字段与 03_Database.md §3.14 notice 一一对应。
 */
@Data
@TableName("notice")
public class Notice {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    private String title;

    private Integer noticeType;

    private String content;

    private String attachmentUrl;

    private Integer status;

    private LocalDateTime publishTime;

    private Long publisherId;

    private Long bizId;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtModified;
}
