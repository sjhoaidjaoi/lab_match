package com.college.labselect.dto.resp;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 管理端公告项，字段对齐 03_Database.md §3.14 与 01_PRD.md 公告管理页。
 */
@Data
public class NoticeAdminVO {

    private Long id;

    private String title;

    private Integer noticeType;

    private String noticeTypeText;

    private String content;

    private String attachmentUrl;

    private Integer status;

    private String statusText;

    private LocalDateTime publishTime;

    private Long publisherId;

    private String publisherName;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtModified;
}
