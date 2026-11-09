package com.labmatch.module.publicity.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;

import java.time.LocalDateTime;

@Data
@TableName("objection")
public class Objection {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long publicationId;

    private Long studentId;

    private String type;

    private String content;

    private String attachmentsJson;

    private String status;

    private String reply;

    private Long handlerId;

    private LocalDateTime handledAt;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
