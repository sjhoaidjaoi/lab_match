package com.labmatch.module.publicity.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;

import java.time.LocalDateTime;

@Data
@TableName("publication")
public class Publication {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long cycleId;

    private Integer roundNo;

    private String title;

    private String status;

    private LocalDateTime publishAt;

    private LocalDateTime expireAt;

    private Long createdBy;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
