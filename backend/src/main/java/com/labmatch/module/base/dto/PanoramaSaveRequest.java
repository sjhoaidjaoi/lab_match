package com.labmatch.module.base.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PanoramaSaveRequest {

    @NotNull(message = "请选择实训室")
    private Long labId;

    @NotBlank(message = "请填写全景名称")
    private String name;

    private String description;

    /** LINK / IMAGE */
    private String panoramaType;

    @NotBlank(message = "请填写全景地址")
    private String panoramaUrl;

    private String coverUrl;

    private Integer sortNo;

    /** DRAFT / PUBLISHED，空值默认 PUBLISHED */
    private String status;
}
