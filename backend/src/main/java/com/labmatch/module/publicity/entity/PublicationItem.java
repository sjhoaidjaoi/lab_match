package com.labmatch.module.publicity.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("publication_item")
public class PublicationItem {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long publicationId;

    private Long studentId;

    private String studentNo;

    private String studentName;

    private Long labId;

    private Long mentorId;
}
