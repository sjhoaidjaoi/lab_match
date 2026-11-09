package com.labmatch.module.application.controller;

import com.labmatch.common.Result;
import com.labmatch.module.application.dto.ApplicationSaveRequest;
import com.labmatch.module.application.dto.ApplicationView;
import com.labmatch.module.application.service.ApplicationService;
import com.labmatch.security.RequireRole;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "意向填报")
@RestController
@RequestMapping("/api/applications")
@RequiredArgsConstructor
@RequireRole("STUDENT")
public class ApplicationController {

    private final ApplicationService applicationService;

    @Operation(summary = "我的报名单（含平行意向与调剂意愿）")
    @GetMapping("/mine")
    public Result<ApplicationView> mine(@RequestParam Long cycleId, @RequestParam Integer round) {
        return Result.ok(applicationService.mine(cycleId, round));
    }

    @Operation(summary = "保存草稿")
    @PutMapping("/mine")
    public Result<ApplicationView> save(@Valid @RequestBody ApplicationSaveRequest request) {
        return Result.ok(applicationService.save(request));
    }

    @Operation(summary = "提交填报（窗口内）")
    @PostMapping("/mine/submit")
    public Result<ApplicationView> submit(@Valid @RequestBody ApplicationSaveRequest request) {
        return Result.ok(applicationService.submit(request));
    }
}
