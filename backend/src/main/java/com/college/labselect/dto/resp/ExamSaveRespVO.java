package com.college.labselect.dto.resp;

import lombok.Data;

/**
 * 答题暂存响应。
 */
@Data
public class ExamSaveRespVO {

    private Integer savedCount;

    private Integer answerStatus;

    private Long remainingSeconds;
}
