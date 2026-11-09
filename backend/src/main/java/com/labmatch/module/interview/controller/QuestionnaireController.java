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
 * 阶段四：问卷编排。
 * TODO(面试模块负责人)：题目 CRUD、冻结后只读、同一导师同轮唯一版本。
 */
@Tag(name = "问卷编排")
@RestController
@RequestMapping("/api/questionnaires")
@RequireRole({"MENTOR", "LAB_HEAD"})
public class QuestionnaireController {

    @Operation(summary = "我的问卷列表")
    @GetMapping
    public Result<List<Object>> list() {
        return Result.ok(List.of());
    }

    @Operation(summary = "创建/编辑问卷")
    @PostMapping
    public Result<Void> save() {
        throw BusinessException.notImplemented("问卷编辑");
    }

    @Operation(summary = "冻结问卷")
    @PostMapping("/{id}/freeze")
    public Result<Void> freeze(@PathVariable Long id) {
        throw BusinessException.notImplemented("冻结问卷");
    }
}
