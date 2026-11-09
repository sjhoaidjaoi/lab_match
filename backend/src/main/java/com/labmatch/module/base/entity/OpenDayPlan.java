package com.labmatch.module.base.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDate;

@Data
@TableName("open_day_plan")
public class OpenDayPlan {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long cycleId;

    private Long labId;

    private LocalDate dateAt;

    private String startTime;

    private String endTime;

    private String location;

    private String note;

    private String status;
}
