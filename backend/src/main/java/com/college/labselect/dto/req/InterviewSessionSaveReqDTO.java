package com.college.labselect.dto.req;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * 新增 / 修改面试场次请求。
 */
@Data
public class InterviewSessionSaveReqDTO {

    @NotNull(message = "轮次 ID 不能为空")
    private Long roundId;

    @NotBlank(message = "场次名称不能为空")
    private String sessionName;

    @NotNull(message = "面试日期不能为空")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate interviewDate;

    @NotNull(message = "开始时间不能为空")
    @JsonFormat(pattern = "HH:mm")
    private LocalTime startTime;

    @NotNull(message = "结束时间不能为空")
    @JsonFormat(pattern = "HH:mm")
    private LocalTime endTime;

    @NotBlank(message = "面试地点不能为空")
    private String location;

    @NotNull(message = "容量不能为空")
    @Min(value = 1, message = "容量必须大于 0")
    private Integer capacity;

    @NotEmpty(message = "面试官不能为空")
    private List<Long> interviewerIds;
}
