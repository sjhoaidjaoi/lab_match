package com.college.labselect.dto.req;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 在线试卷保存请求。
 */
@Data
public class ExamPaperSaveReqDTO {

    private Long roundId;

    @NotBlank(message = "试卷标题不能为空")
    @Size(max = 200, message = "试卷标题最长 200 字")
    private String title;

    @Size(max = 1000, message = "试卷说明最长 1000 字")
    private String description;

    @NotNull(message = "答题开始时间不能为空")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime startTime;

    @NotNull(message = "答题结束时间不能为空")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime endTime;

    @NotNull(message = "答题时长不能为空")
    @Min(value = 1, message = "答题时长至少 1 分钟")
    @Max(value = 300, message = "答题时长不超过 300 分钟")
    private Integer durationMinutes;

    @NotEmpty(message = "试卷至少包含一道题")
    @Size(max = 100, message = "单张试卷最多 100 题")
    @Valid
    private List<ExamPaperQuestionReqDTO> questions;
}
