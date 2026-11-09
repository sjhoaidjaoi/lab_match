package com.labmatch.module.base.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class VideoSaveRequest {

    @NotNull(message = "请选择实训室")
    private Long labId;

    @NotBlank(message = "请填写视频标题")
    private String title;

    private String description;

    /** MP4 / LINK / EMBED */
    private String videoType;

    @NotBlank(message = "请填写视频地址")
    private String videoUrl;

    private String coverUrl;

    private Integer durationSeconds;

    private Integer sortNo;

    /** DRAFT / PUBLISHED，空值默认 PUBLISHED */
    private String status;
}
