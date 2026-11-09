package com.labmatch.module.base.controller;

import com.labmatch.common.Result;
import com.labmatch.module.base.dto.PanoramaSaveRequest;
import com.labmatch.module.base.dto.PanoramaView;
import com.labmatch.module.base.dto.VideoSaveRequest;
import com.labmatch.module.base.dto.VideoView;
import com.labmatch.module.base.service.MediaService;
import com.labmatch.security.RequireRole;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 阶段一「集中宣讲」视频 与 阶段二「实训室开放日」720° 全景云游。
 *
 * 接入约定：
 * 1. 视频：videoType=MP4 走原生播放器；LINK/EMBED 走 iframe，可直接挂 B 站 / 校内视频平台。
 * 2. 全景：panoramaType=LINK 用 iframe 加载 720 云 / Krpano 作品页；IMAGE 为等距柱状全景图直链。
 * 3. 学生端只看 PUBLISHED；管理端可查看与维护全部。
 */
@Tag(name = "宣讲视频与全景云游")
@RestController
@RequestMapping("/api/media")
@RequiredArgsConstructor
public class MediaController {

    private final MediaService mediaService;

    @Operation(summary = "宣讲视频列表（已发布）")
    @GetMapping("/videos")
    public Result<List<VideoView>> videos(@RequestParam(required = false) Long labId) {
        return Result.ok(mediaService.videos(labId));
    }

    @Operation(summary = "某实训室的宣讲视频（已发布）")
    @GetMapping("/labs/{labId}/videos")
    public Result<List<VideoView>> labVideos(@PathVariable Long labId) {
        return Result.ok(mediaService.videos(labId));
    }

    @Operation(summary = "720° 全景云游列表（已发布）")
    @GetMapping("/panoramas")
    public Result<List<PanoramaView>> panoramas(@RequestParam(required = false) Long labId) {
        return Result.ok(mediaService.panoramas(labId));
    }

    @Operation(summary = "某实训室的全景云游（已发布）")
    @GetMapping("/labs/{labId}/panoramas")
    public Result<List<PanoramaView>> labPanoramas(@PathVariable Long labId) {
        return Result.ok(mediaService.panoramas(labId));
    }

    @Operation(summary = "宣讲视频列表（管理端，含草稿）")
    @GetMapping("/admin/videos")
    @RequireRole({"COLLEGE_ADMIN", "LAB_HEAD"})
    public Result<List<VideoView>> adminVideos(@RequestParam(required = false) Long labId) {
        return Result.ok(mediaService.allVideos(labId));
    }

    @Operation(summary = "新增宣讲视频")
    @PostMapping("/admin/videos")
    @RequireRole({"COLLEGE_ADMIN", "LAB_HEAD"})
    public Result<VideoView> createVideo(@Valid @RequestBody VideoSaveRequest request) {
        return Result.ok(mediaService.createVideo(request));
    }

    @Operation(summary = "修改宣讲视频")
    @PutMapping("/admin/videos/{id}")
    @RequireRole({"COLLEGE_ADMIN", "LAB_HEAD"})
    public Result<VideoView> updateVideo(@PathVariable Long id, @Valid @RequestBody VideoSaveRequest request) {
        return Result.ok(mediaService.updateVideo(id, request));
    }

    @Operation(summary = "删除宣讲视频")
    @DeleteMapping("/admin/videos/{id}")
    @RequireRole({"COLLEGE_ADMIN", "LAB_HEAD"})
    public Result<Void> deleteVideo(@PathVariable Long id) {
        mediaService.deleteVideo(id);
        return Result.ok(null);
    }

    @Operation(summary = "全景云游列表（管理端，含草稿）")
    @GetMapping("/admin/panoramas")
    @RequireRole({"COLLEGE_ADMIN", "LAB_HEAD"})
    public Result<List<PanoramaView>> adminPanoramas(@RequestParam(required = false) Long labId) {
        return Result.ok(mediaService.allPanoramas(labId));
    }

    @Operation(summary = "新增全景云游")
    @PostMapping("/admin/panoramas")
    @RequireRole({"COLLEGE_ADMIN", "LAB_HEAD"})
    public Result<PanoramaView> createPanorama(@Valid @RequestBody PanoramaSaveRequest request) {
        return Result.ok(mediaService.createPanorama(request));
    }

    @Operation(summary = "修改全景云游")
    @PutMapping("/admin/panoramas/{id}")
    @RequireRole({"COLLEGE_ADMIN", "LAB_HEAD"})
    public Result<PanoramaView> updatePanorama(@PathVariable Long id, @Valid @RequestBody PanoramaSaveRequest request) {
        return Result.ok(mediaService.updatePanorama(id, request));
    }

    @Operation(summary = "删除全景云游")
    @DeleteMapping("/admin/panoramas/{id}")
    @RequireRole({"COLLEGE_ADMIN", "LAB_HEAD"})
    public Result<Void> deletePanorama(@PathVariable Long id) {
        mediaService.deletePanorama(id);
        return Result.ok(null);
    }
}
