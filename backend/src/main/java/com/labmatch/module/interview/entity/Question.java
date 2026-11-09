package com.labmatch.module.interview.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("question")
public class Question {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long questionnaireId;

    private Integer seq;

    private String type;

    private String title;

    private String body;

    private Boolean required;

    private String optionsJson;

    private Integer scoreHint;

    private Integer maxLength;
}
