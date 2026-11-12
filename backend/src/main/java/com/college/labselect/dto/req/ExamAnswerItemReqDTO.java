package com.college.labselect.dto.req;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 单题作答请求。
 */
@Data
public class ExamAnswerItemReqDTO {

    @NotNull(message = "题目不能为空")
    private Long questionId;

    @Size(max = 2000, message = "作答内容最长 2000 字")
    private String answerContent;
}
