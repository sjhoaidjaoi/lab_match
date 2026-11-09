package com.labmatch.module.adjustment.controller;

import com.labmatch.common.BusinessException;
import com.labmatch.common.Result;
import com.labmatch.security.RequireRole;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 阶段七：统筹调剂。三级优先：L1 室内 → L2 跨室 → L3 谈话安置。
 * TODO(调剂模块负责人)：建池、优先匹配、同意校验（INV-09）、直接分配与放弃。
 */
@Tag(name = "统筹调剂")
@RestController
@RequestMapping("/api")
public class AdjustmentController {

    @Operation(summary = "调剂池")
    @GetMapping("/adjustment/pools")
    @RequireRole({"LAB_HEAD", "COLLEGE_ADMIN"})
    public Result<List<Object>> pools() {
        return Result.ok(List.of());
    }

    @Operation(summary = "执行调剂分配")
    @PostMapping("/adjustment/assign")
    @RequireRole({"LAB_HEAD", "COLLEGE_ADMIN"})
    public Result<Void> assign() {
        throw BusinessException.notImplemented("调剂分配");
    }

    @Operation(summary = "谈话安置记录")
    @GetMapping("/talk-records")
    @RequireRole("COLLEGE_ADMIN")
    public Result<List<Object>> talkRecords() {
        return Result.ok(List.of());
    }

    @Operation(summary = "新增谈话安置记录")
    @PostMapping("/talk-records")
    @RequireRole("COLLEGE_ADMIN")
    public Result<Void> createTalkRecord() {
        throw BusinessException.notImplemented("谈话安置记录");
    }
}
