package com.college.labselect.dto.req;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

/**
 * 在线答题保存请求，支持全量暂存。
 */
@Data
public class ExamAnswerSaveReqDTO {

    @NotEmpty(message = "作答内容不能为空")
    @Size(max = 100, message = "单次最多保存 100 题")
    @Valid
    private List<ExamAnswerItemReqDTO> items;
}
