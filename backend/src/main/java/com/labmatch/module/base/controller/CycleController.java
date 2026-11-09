package com.labmatch.module.base.controller;

import com.labmatch.common.Result;
import com.labmatch.module.base.dto.CycleDetailView;
import com.labmatch.module.base.entity.Cycle;
import com.labmatch.module.base.entity.Round;
import com.labmatch.module.base.service.CycleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "周期与阶段")
@RestController
@RequestMapping("/api/cycles")
@RequiredArgsConstructor
public class CycleController {

    private final CycleService cycleService;

    @Operation(summary = "当前周期、轮次与所处阶段")
    @GetMapping("/current")
    public Result<CycleDetailView> current() {
        return Result.ok(cycleService.current());
    }

    @Operation(summary = "周期列表")
    @GetMapping
    public Result<List<Cycle>> list() {
        return Result.ok(cycleService.list());
    }

    @Operation(summary = "指定周期的轮次")
    @GetMapping("/{cycleId}/rounds")
    public Result<List<Round>> rounds(@PathVariable Long cycleId) {
        return Result.ok(cycleService.rounds(cycleId));
    }
}
