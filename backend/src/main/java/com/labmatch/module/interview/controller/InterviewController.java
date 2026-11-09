package com.labmatch.module.interview.controller;

import com.labmatch.common.BusinessException;
import com.labmatch.common.Result;
import com.labmatch.security.RequireRole;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 阶段四：问卷与面试。
 * TODO(面试模块负责人)：实现问卷作答、评分、评语与名单编排；评分仅导师可写，负责人只读。
 */
@Tag(name = "面试与问卷")
@RestController
@RequestMapping("/api/interviews")
public class InterviewController {

    @Operation(summary = "我的面试任务（学生）")
    @GetMapping("/mine")
    @RequireRole("STUDENT")
    public Result<List<Object>> mine() {
        return Result.ok(List.of());
    }

    @Operation(summary = "面试详情与题目")
    @GetMapping("/{id}")
    @RequireRole({"STUDENT", "MENTOR", "LAB_HEAD", "COLLEGE_ADMIN"})
    public Result<Object> detail(@PathVariable Long id) {
        throw BusinessException.notImplemented("面试详情");
    }

    @Operation(summary = "提交问卷作答")
    @PostMapping("/{id}/submit")
    @RequireRole("STUDENT")
    public Result<Void> submit(@PathVariable Long id) {
        throw BusinessException.notImplemented("提交问卷作答");
    }

    @Operation(summary = "导师待评分列表")
    @GetMapping("/mentor/todo")
    @RequireRole({"MENTOR", "LAB_HEAD"})
    public Result<List<Object>> mentorTodo() {
        return Result.ok(List.of());
    }

    @Operation(summary = "录入四维评分与评语")
    @PostMapping("/{id}/score")
    @RequireRole("MENTOR")
    public Result<Void> score(@PathVariable Long id) {
        throw BusinessException.notImplemented("四维评分");
    }
}
