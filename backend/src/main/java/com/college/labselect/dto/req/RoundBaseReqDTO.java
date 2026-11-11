package com.college.labselect.dto.req;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 轮次时间窗与权重基础请求。
 */
@Data
public class RoundBaseReqDTO {

    @NotBlank(message = "轮次名称不能为空")
    private String roundName;

    @NotNull(message = "填报开始时间不能为空")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime applyStart;

    @NotNull(message = "填报结束时间不能为空")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime applyEnd;

    @NotNull(message = "面试开始时间不能为空")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime interviewStart;

    @NotNull(message = "面试结束时间不能为空")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime interviewEnd;

    @NotNull(message = "名单提交开始时间不能为空")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime nominationStart;

    @NotNull(message = "名单提交截止时间不能为空")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime nominationSubmitEnd;

    @NotNull(message = "学生确认开始时间不能为空")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime confirmStart;

    @NotNull(message = "确认截止时间不能为空")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime nominationEnd;

    @NotNull(message = "调剂开始时间不能为空")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime adjustStart;

    @NotNull(message = "调剂结束时间不能为空")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime adjustEnd;

    @NotNull(message = "学习态度权重不能为空")
    @DecimalMin(value = "0.00", message = "学习态度权重不能小于 0")
    @DecimalMax(value = "100.00", message = "学习态度权重不能大于 100")
    private BigDecimal weightAttitude;

    @NotNull(message = "逻辑思维权重不能为空")
    @DecimalMin(value = "0.00", message = "逻辑思维权重不能小于 0")
    @DecimalMax(value = "100.00", message = "逻辑思维权重不能大于 100")
    private BigDecimal weightLogic;

    @NotNull(message = "编程基础权重不能为空")
    @DecimalMin(value = "0.00", message = "编程基础权重不能小于 0")
    @DecimalMax(value = "100.00", message = "编程基础权重不能大于 100")
    private BigDecimal weightProgramming;

    @NotNull(message = "时间投入权重不能为空")
    @DecimalMin(value = "0.00", message = "时间投入权重不能小于 0")
    @DecimalMax(value = "100.00", message = "时间投入权重不能大于 100")
    private BigDecimal weightTime;
}
