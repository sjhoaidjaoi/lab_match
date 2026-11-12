package com.college.labselect.dto.req;

import lombok.Data;

import java.util.List;

/**
 * 标记通知已读请求，ids 为空表示全部标记已读。
 */
@Data
public class NoticeReadReqDTO {

    private List<Long> ids;
}
