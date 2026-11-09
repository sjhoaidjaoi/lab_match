package com.labmatch.module.application.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("student_statement")
public class StudentStatement {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long applicationId;

    private Integer version;

    private String content;

    private LocalDateTime submittedAt;
}
