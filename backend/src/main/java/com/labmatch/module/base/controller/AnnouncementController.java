package com.labmatch.module.base.controller;

import com.labmatch.common.Result;
import com.labmatch.module.base.entity.Announcement;
import com.labmatch.module.base.service.CatalogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "公告")
@RestController
@RequestMapping("/api/announcements")
@RequiredArgsConstructor
public class AnnouncementController {

    private final CatalogService catalogService;

    @Operation(summary = "已发布公告列表")
    @GetMapping
    public Result<List<Announcement>> list(@RequestParam(required = false) Long cycleId) {
        return Result.ok(catalogService.announcements(cycleId));
    }
}
