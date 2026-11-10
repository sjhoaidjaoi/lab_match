package com.labmatch.selection.controller;
import com.labmatch.selection.dto.resp.Result; import org.springframework.web.bind.annotation.*; import java.util.Map;
@RestController @RequestMapping("/api") public class HealthController { @GetMapping("/health") public Result<Map<String, String>> health() { return Result.ok(Map.of("status", "UP", "service", "selection-backend")); } }
