package com.labmatch.module.base.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 实训室开放日 720° 全景云游资源（阶段二）。
 */
@Data
@TableName("lab_panorama")
public class LabPanorama {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long labId;

    private String name;

    private String description;

    /** LINK 第三方全景链接（720 云 / Krpano / 自建页）/ IMAGE 等距柱状全景图 */
    private String panoramaType;

    private String panoramaUrl;

    private String coverUrl;

    private Integer sortNo;

    /** DRAFT / PUBLISHED */
    private String status;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
