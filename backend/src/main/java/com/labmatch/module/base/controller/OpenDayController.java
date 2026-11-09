package com.labmatch.module.base.controller;

import com.labmatch.common.Result;
import com.labmatch.module.base.entity.OpenDayPlan;
import com.labmatch.module.base.service.CatalogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "开放日")
@RestController
@RequestMapping("/api/open-day-plans")
@RequiredArgsConstructor
public class OpenDayController {

    private final CatalogService catalogService;

    @Operation(summary = "开放日安排")
    @GetMapping
    public Result<List<OpenDayPlan>> list(@RequestParam(required = false) Long cycleId) {
        return Result.ok(catalogService.openDayPlans(cycleId));
    }
}
