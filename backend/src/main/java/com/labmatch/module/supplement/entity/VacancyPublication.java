package com.labmatch.module.supplement.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("vacancy_publication")
public class VacancyPublication {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long cycleId;

    private Integer roundNo;

    private Long mentorId;

    private Integer available;

    private LocalDateTime publishedAt;
}
