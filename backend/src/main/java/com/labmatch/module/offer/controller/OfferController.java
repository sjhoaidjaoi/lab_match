package com.labmatch.module.offer.controller;

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
 * 阶段五：Offer 签发、确认与名额台账。
 * TODO(Offer 模块负责人)：批量签发、单 offer 自动确认、多 offer 择一、
 * 超时放弃、递补级联、quota 事务（SELECT ... FOR UPDATE）。
 */
@Tag(name = "Offer 与确认")
@RestController
@RequestMapping("/api/offers")
public class OfferController {

    @Operation(summary = "我的 Offer（学生）")
    @GetMapping("/mine")
    @RequireRole("STUDENT")
    public Result<List<Object>> mine() {
        return Result.ok(List.of());
    }

    @Operation(summary = "接受录取")
    @PostMapping("/{id}/confirm")
    @RequireRole("STUDENT")
    public Result<Void> confirm(@PathVariable Long id) {
        throw BusinessException.notImplemented("接受录取");
    }

    @Operation(summary = "放弃录取")
    @PostMapping("/{id}/decline")
    @RequireRole("STUDENT")
    public Result<Void> decline(@PathVariable Long id) {
        throw BusinessException.notImplemented("放弃录取");
    }

    @Operation(summary = "导师发出的 Offer")
    @GetMapping
    @RequireRole({"MENTOR", "LAB_HEAD", "COLLEGE_ADMIN"})
    public Result<List<Object>> list() {
        return Result.ok(List.of());
    }

    @Operation(summary = "批量签发 Offer（名单提交后）")
    @PostMapping("/issue")
    @RequireRole({"LAB_HEAD", "COLLEGE_ADMIN"})
    public Result<Void> issue() {
        throw BusinessException.notImplemented("批量签发 Offer");
    }
}
