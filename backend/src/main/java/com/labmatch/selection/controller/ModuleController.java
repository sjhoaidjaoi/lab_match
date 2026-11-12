package com.labmatch.selection.controller;
import com.labmatch.selection.dto.resp.Result; import com.labmatch.selection.aspect.*; import org.springframework.web.bind.annotation.*; import java.util.*;
/** Eight-stage business modules: placeholders only; controllers are ready for domain services and mappers. */
@RestController @RequestMapping("/api") public class ModuleController {
  @GetMapping({"/users", "/batches", "/batches/current", "/announcements", "/media", "/labs", "/mentors", "/applications", "/interviews", "/selections", "/admissions", "/supplementary", "/allocations", "/publicity", "/enrollments", "/statistics/**"}) @WebLog("查询模块占位数据") @RateLimit public Result<Map<String,Object>> list() { return Result.ok(Map.of("records", List.of(), "total", 0, "current", 1, "size", 10, "notice", "功能开发中：已建立接口契约与权限入口")); }
  @GetMapping("/{module}/{*path}") @WebLog("查询模块子资源占位数据") @RateLimit public Result<Map<String,Object>> detail(@PathVariable String module, @PathVariable String path) { return Result.ok(Map.of("records", List.of(), "total", 0, "current", 1, "size", 10, "module", module, "path", path, "notice", "功能开发中：已建立接口契约与权限入口")); }
}
