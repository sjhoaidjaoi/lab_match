package com.labmatch.module.interview.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("response")
public class Response {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long interviewId;

    private String answersJson;

    private LocalDateTime submittedAt;
}
