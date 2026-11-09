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
 * 阶段四：导师名单（拟录取 / 递补 / 内部调剂候选）。
 * TODO(面试模块负责人)：编名单、排序留痕、冻结、提交。
 */
@Tag(name = "导师名单")
@RestController
@RequestMapping("/api/mentor-lists")
@RequireRole({"MENTOR", "LAB_HEAD"})
public class MentorListController {

    @Operation(summary = "我的名单")
    @GetMapping
    public Result<List<Object>> list() {
        return Result.ok(List.of());
    }

    @Operation(summary = "保存名单草稿")
    @PostMapping("/draft")
    public Result<Void> saveDraft() {
        throw BusinessException.notImplemented("保存导师名单");
    }

    @Operation(summary = "提交名单（冻结）")
    @PostMapping("/submit")
    public Result<Void> submit() {
        throw BusinessException.notImplemented("提交导师名单");
    }

    @Operation(summary = "调整递补顺位")
    @PostMapping("/{id}/reorder")
    public Result<Void> reorder(@PathVariable Long id) {
        throw BusinessException.notImplemented("调整递补顺位");
    }
}
