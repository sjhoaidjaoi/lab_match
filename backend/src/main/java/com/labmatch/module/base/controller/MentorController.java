package com.labmatch.module.base.controller;

import com.labmatch.common.Result;
import com.labmatch.module.base.dto.MentorView;
import com.labmatch.module.base.service.CatalogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "导师目录")
@RestController
@RequestMapping("/api/mentors")
@RequiredArgsConstructor
public class MentorController {

    private final CatalogService catalogService;

    @Operation(summary = "导师列表（可按实训室筛选）")
    @GetMapping
    public Result<List<MentorView>> list(@RequestParam(required = false) Long labId) {
        return Result.ok(labId == null ? catalogService.mentors() : catalogService.mentorsOfLab(labId));
    }
}
