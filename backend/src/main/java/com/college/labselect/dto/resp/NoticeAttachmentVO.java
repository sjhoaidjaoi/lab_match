package com.college.labselect.dto.resp;

import lombok.Data;

/**
 * 公告附件上传结果，字段对齐 04_API.md §3.62。
 */
@Data
public class NoticeAttachmentVO {

    /**
     * 原始文件名。
     */
    private String fileName;

    /**
     * 附件访问地址。
     */
    private String url;
}
