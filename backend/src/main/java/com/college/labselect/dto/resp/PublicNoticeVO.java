package com.college.labselect.dto.resp;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 公共端公告项，仅暴露已发布内容。
 */
@Data
public class PublicNoticeVO {

    private Long id;

    private String title;

    private Integer noticeType;

    private String noticeTypeText;

    private String content;

    private String attachmentUrl;

    private LocalDateTime publishTime;
}
