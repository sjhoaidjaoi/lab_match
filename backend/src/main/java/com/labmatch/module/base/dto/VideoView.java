package com.labmatch.module.base.dto;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 面向学生端的宣讲视频视图。
 */
@Data
public class VideoView {

    private Long id;
    private Long labId;
    private String labName;
    private String title;
    private String description;
    private String videoType;
    private String videoUrl;
    private String coverUrl;
    private Integer durationSeconds;
    private Integer sortNo;
    private String status;
    private LocalDateTime createdAt;
}
