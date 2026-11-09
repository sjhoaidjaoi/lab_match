package com.labmatch.module.offer.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;

import java.time.LocalDateTime;

@Data
@TableName("confirmation")
public class Confirmation {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long offerId;

    private String action;

    private String note;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
