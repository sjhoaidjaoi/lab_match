package com.college.labselect.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 导师档案实体，字段与 03_Database.md §3.3 mentor_profile 一一对应。
 */
@Data
@TableName("mentor_profile")
public class MentorProfile {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    private Long userId;

    private Long labId;

    private String researchDirection;

    private String researchProjects;

    private Integer quota;

    private Integer quotaUsed;

    private Integer version;

    private Integer status;

    private LocalDateTime gmtCreate;

    private LocalDateTime gmtModified;
}
