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
 * 阶段八：公示与正式入组。
 * TODO(公示模块负责人)：名单快照、脱敏（他人学号/姓名）、公示计时、异议联动、最终名单锁定。
 */
@Tag(name = "公示")
@RestController
@RequestMapping("/api/publications")
public class PublicationController {

    @Operation(summary = "当前公示")
    @GetMapping("/current")
    public Result<Object> current() {
        return Result.ok(null);
    }

    @Operation(summary = "公示名单（脱敏）")
    @GetMapping("/{id}/items")
    public Result<List<Object>> items(@PathVariable Long id) {
        return Result.ok(List.of());
    }

    @Operation(summary = "发起公示")
    @PostMapping
    @RequireRole("COLLEGE_ADMIN")
    public Result<Void> create() {
        throw BusinessException.notImplemented("发起公示");
    }

    @Operation(summary = "发布公示")
    @PostMapping("/{id}/publish")
    @RequireRole("COLLEGE_ADMIN")
    public Result<Void> publish(@PathVariable Long id) {
        throw BusinessException.notImplemented("发布公示");
    }

    @Operation(summary = "确认最终名单并锁定")
    @PostMapping("/{id}/lock")
    @RequireRole("COLLEGE_ADMIN")
    public Result<Void> lock(@PathVariable Long id) {
        throw BusinessException.notImplemented("锁定最终名单");
    }
}
