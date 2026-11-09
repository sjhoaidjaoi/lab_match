package com.labmatch.module.audit.controller;

import com.labmatch.common.Result;
import com.labmatch.security.RequireRole;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 审计与敏感访问日志（设计文档 11.8）。
 * TODO(审计模块负责人)：操作审计切面 @AuditLog、访问理由记录、分页与导出。
 */
@Tag(name = "审计")
@RestController
@RequestMapping("/api")
@RequireRole({"COLLEGE_ADMIN", "SYS_ADMIN"})
public class AuditController {

    @Operation(summary = "操作审计日志")
    @GetMapping("/audit-logs")
    public Result<List<Object>> auditLogs() {
        return Result.ok(List.of());
    }

    @Operation(summary = "敏感数据访问日志")
    @GetMapping("/access-logs")
    public Result<List<Object>> accessLogs() {
        return Result.ok(List.of());
    }
}
