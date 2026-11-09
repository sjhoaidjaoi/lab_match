package com.labmatch.module.base.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 集中宣讲视频（阶段一）。一个实训室可挂多个视频。
 */
@Data
@TableName("lab_video")
public class LabVideo {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long labId;

    private String title;

    private String description;

    /** MP4 直链 / LINK 外链页面 / EMBED 内嵌 */
    private String videoType;

    private String videoUrl;

    private String coverUrl;

    private Integer durationSeconds;

    private Integer sortNo;

    /** DRAFT / PUBLISHED */
    private String status;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
