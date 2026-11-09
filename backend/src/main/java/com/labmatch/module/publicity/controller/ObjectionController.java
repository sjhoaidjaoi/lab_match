package com.labmatch.module.publicity.controller;

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
 * 阶段八：异议工单。
 * TODO(公示模块负责人)：提交（限公示期内）、处理结论、通知联动、附件上传。
 */
@Tag(name = "异议")
@RestController
@RequestMapping("/api/objections")
public class ObjectionController {

    @Operation(summary = "提交异议（学生）")
    @PostMapping
    @RequireRole("STUDENT")
    public Result<Void> create() {
        throw BusinessException.notImplemented("提交异议");
    }

    @Operation(summary = "我的异议（学生）")
    @GetMapping("/mine")
    @RequireRole("STUDENT")
    public Result<List<Object>> mine() {
        return Result.ok(List.of());
    }

    @Operation(summary = "异议列表（学院）")
    @GetMapping
    @RequireRole("COLLEGE_ADMIN")
    public Result<List<Object>> list() {
        return Result.ok(List.of());
    }

    @Operation(summary = "处理异议")
    @PostMapping("/{id}/handle")
    @RequireRole("COLLEGE_ADMIN")
    public Result<Void> handle(@PathVariable Long id) {
        throw BusinessException.notImplemented("处理异议");
    }
}
