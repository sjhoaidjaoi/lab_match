package com.labmatch.module.supplement.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;

import java.time.LocalDateTime;

@Data
@TableName("round_result")
public class RoundResult {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long cycleId;

    private Integer roundNo;

    private Integer confirmedCount;

    private Integer vacanciesAfter;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
