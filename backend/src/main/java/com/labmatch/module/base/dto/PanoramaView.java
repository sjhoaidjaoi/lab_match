package com.labmatch.module.base.dto;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 面向学生端的 720° 全景云游视图。
 */
@Data
public class PanoramaView {

    private Long id;
    private Long labId;
    private String labName;
    private String name;
    private String description;
    private String panoramaType;
    private String panoramaUrl;
    private String coverUrl;
    private Integer sortNo;
    private String status;
    private LocalDateTime createdAt;
}
