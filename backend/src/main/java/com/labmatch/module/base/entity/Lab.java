package com.labmatch.module.base.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;

import java.time.LocalDateTime;

@Data
@TableName("lab")
public class Lab {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String name;

    private String department;

    private Long leaderId;

    private String intro;

    private String directions;

    private String facilities;

    private String trainingPlan;

    private String assessment;

    private String openDayInfo;

    private Integer totalQuota;

    private String status;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
