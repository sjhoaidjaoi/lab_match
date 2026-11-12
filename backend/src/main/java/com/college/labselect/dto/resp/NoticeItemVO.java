package com.college.labselect.dto.resp;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 站内通知项，字段对齐 03_Database.md §3.17。
 */
@Data
public class NoticeItemVO {

    private Long id;

    private String title;

    private String content;

    private Integer noticeType;

    private String noticeTypeText;

    private String bizType;

    private Long bizId;

    private Integer isRead;

    private LocalDateTime readTime;

    private LocalDateTime gmtCreate;
}
