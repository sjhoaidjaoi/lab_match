package com.labmatch.module.base.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;

import java.time.LocalDateTime;

@Data
@TableName("quota_balance")
public class QuotaBalance {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long cycleId;

    private Long mentorId;

    private Integer quota;

    private Integer used;

    private Integer reserved;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
