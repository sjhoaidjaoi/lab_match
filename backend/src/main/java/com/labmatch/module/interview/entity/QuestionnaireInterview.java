package com.labmatch.module.interview.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("questionnaire_interview")
public class QuestionnaireInterview {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long cycleId;

    private Integer round;

    private Long mentorId;

    private Long studentId;

    private Long questionnaireId;

    private String status;

    private LocalDateTime startedAt;

    private LocalDateTime submittedAt;

    private LocalDateTime deadlineAt;
}
