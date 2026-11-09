package com.labmatch.module.application.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("submission_receipt")
public class SubmissionReceipt {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long applicationId;

    private String receiptNo;

    private String contentSnapshot;

    private LocalDateTime submittedAt;
}
