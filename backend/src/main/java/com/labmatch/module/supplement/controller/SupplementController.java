package com.labmatch.module.supplement.controller;

import com.labmatch.common.Result;
import com.labmatch.security.RequireRole;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 阶段六：分轮补录。剩余名额必须由系统计算，不能手工填。
 * TODO(补录模块负责人)：剩余名额聚合、补录轮次复用填报/面试/确认、轮次对账。
 */
@Tag(name = "补录与剩余名额")
@RestController
@RequestMapping("/api")
public class SupplementController {

    @Operation(summary = "剩余名额列表")
    @GetMapping("/vacancies")
    public Result<List<Object>> vacancies() {
        return Result.ok(List.of());
    }

    @Operation(summary = "轮次结算结果")
    @GetMapping("/rounds/{roundNo}/result")
    @RequireRole({"LAB_HEAD", "COLLEGE_ADMIN"})
    public Result<Map<String, Object>> roundResult(@PathVariable Integer roundNo) {
        return Result.ok(Map.of("roundNo", roundNo, "confirmedCount", 0, "vacanciesAfter", 0));
    }
}
