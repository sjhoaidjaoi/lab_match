package com.labmatch.module.base.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labmatch.common.BusinessException;
import com.labmatch.common.ResultCode;
import com.labmatch.module.base.dto.PanoramaSaveRequest;
import com.labmatch.module.base.dto.PanoramaView;
import com.labmatch.module.base.dto.VideoSaveRequest;
import com.labmatch.module.base.dto.VideoView;
import com.labmatch.module.base.entity.Lab;
import com.labmatch.module.base.entity.LabPanorama;
import com.labmatch.module.base.entity.LabVideo;
import com.labmatch.module.base.mapper.LabMapper;
import com.labmatch.module.base.mapper.LabPanoramaMapper;
import com.labmatch.module.base.mapper.LabVideoMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 媒体资源中心：集中宣讲视频（阶段一）与 720° 全景云游（阶段二）。
 * 学生端只读已发布资源，管理端（学院管理员 / 实训室负责人）可增删改。
 */
@Service
@RequiredArgsConstructor
public class MediaService {

    private static final Set<String> VIDEO_TYPES = Set.of("MP4", "LINK", "EMBED");
    private static final Set<String> PANORAMA_TYPES = Set.of("LINK", "IMAGE");

    private final LabVideoMapper videoMapper;
    private final LabPanoramaMapper panoramaMapper;
    private final LabMapper labMapper;

    public List<VideoView> videos(Long labId) {
        return videoViews(labId, true);
    }

    public List<VideoView> allVideos(Long labId) {
        return videoViews(labId, false);
    }

    public List<PanoramaView> panoramas(Long labId) {
        return panoramaViews(labId, true);
    }

    public List<PanoramaView> allPanoramas(Long labId) {
        return panoramaViews(labId, false);
    }

    public VideoView createVideo(VideoSaveRequest request) {
        requireLab(request.getLabId());
        LabVideo video = new LabVideo();
        apply(video, request);
        videoMapper.insert(video);
        return toView(video, labName(video.getLabId()));
    }

    public VideoView updateVideo(Long id, VideoSaveRequest request) {
        LabVideo video = videoMapper.selectById(id);
        if (video == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "宣讲视频不存在", HttpStatus.NOT_FOUND);
        }
        requireLab(request.getLabId());
        apply(video, request);
        videoMapper.updateById(video);
        return toView(video, labName(video.getLabId()));
    }

    public void deleteVideo(Long id) {
        videoMapper.deleteById(id);
    }

    public PanoramaView createPanorama(PanoramaSaveRequest request) {
        requireLab(request.getLabId());
        LabPanorama panorama = new LabPanorama();
        apply(panorama, request);
        panoramaMapper.insert(panorama);
        return toView(panorama, labName(panorama.getLabId()));
    }

    public PanoramaView updatePanorama(Long id, PanoramaSaveRequest request) {
        LabPanorama panorama = panoramaMapper.selectById(id);
        if (panorama == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "全景资源不存在", HttpStatus.NOT_FOUND);
        }
        requireLab(request.getLabId());
        apply(panorama, request);
        panoramaMapper.updateById(panorama);
        return toView(panorama, labName(panorama.getLabId()));
    }

    public void deletePanorama(Long id) {
        panoramaMapper.deleteById(id);
    }

    private List<VideoView> videoViews(Long labId, boolean publishedOnly) {
        List<LabVideo> videos = videoMapper.selectList(new LambdaQueryWrapper<LabVideo>()
                .eq(labId != null, LabVideo::getLabId, labId)
                .eq(publishedOnly, LabVideo::getStatus, "PUBLISHED")
                .orderByAsc(LabVideo::getSortNo)
                .orderByAsc(LabVideo::getId));
        Map<Long, String> names = labNames();
        return videos.stream().map(v -> toView(v, names.get(v.getLabId()))).toList();
    }

    private List<PanoramaView> panoramaViews(Long labId, boolean publishedOnly) {
        List<LabPanorama> panoramas = panoramaMapper.selectList(new LambdaQueryWrapper<LabPanorama>()
                .eq(labId != null, LabPanorama::getLabId, labId)
                .eq(publishedOnly, LabPanorama::getStatus, "PUBLISHED")
                .orderByAsc(LabPanorama::getSortNo)
                .orderByAsc(LabPanorama::getId));
        Map<Long, String> names = labNames();
        return panoramas.stream().map(p -> toView(p, names.get(p.getLabId()))).toList();
    }

    private void apply(LabVideo video, VideoSaveRequest request) {
        video.setLabId(request.getLabId());
        video.setTitle(request.getTitle());
        video.setDescription(request.getDescription());
        video.setVideoType(normalize(request.getVideoType(), VIDEO_TYPES, "MP4"));
        video.setVideoUrl(request.getVideoUrl());
        video.setCoverUrl(request.getCoverUrl());
        video.setDurationSeconds(request.getDurationSeconds());
        video.setSortNo(request.getSortNo() == null ? 0 : request.getSortNo());
        video.setStatus(normalize(request.getStatus(), Set.of("DRAFT", "PUBLISHED"), "PUBLISHED"));
    }

    private void apply(LabPanorama panorama, PanoramaSaveRequest request) {
        panorama.setLabId(request.getLabId());
        panorama.setName(request.getName());
        panorama.setDescription(request.getDescription());
        panorama.setPanoramaType(normalize(request.getPanoramaType(), PANORAMA_TYPES, "LINK"));
        panorama.setPanoramaUrl(request.getPanoramaUrl());
        panorama.setCoverUrl(request.getCoverUrl());
        panorama.setSortNo(request.getSortNo() == null ? 0 : request.getSortNo());
        panorama.setStatus(normalize(request.getStatus(), Set.of("DRAFT", "PUBLISHED"), "PUBLISHED"));
    }

    private String normalize(String value, Set<String> allowed, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        String upper = value.toUpperCase();
        return allowed.contains(upper) ? upper : fallback;
    }

    private void requireLab(Long labId) {
        if (labId == null || labMapper.selectById(labId) == null) {
            throw new BusinessException(ResultCode.VALIDATION_FAILED, "实训室不存在");
        }
    }

    private String labName(Long labId) {
        Lab lab = labMapper.selectById(labId);
        return lab == null ? null : lab.getName();
    }

    private Map<Long, String> labNames() {
        return labMapper.selectList(null).stream()
                .collect(Collectors.toMap(Lab::getId, Lab::getName, (a, b) -> a));
    }

    private VideoView toView(LabVideo video, String labName) {
        VideoView view = new VideoView();
        view.setId(video.getId());
        view.setLabId(video.getLabId());
        view.setLabName(labName);
        view.setTitle(video.getTitle());
        view.setDescription(video.getDescription());
        view.setVideoType(video.getVideoType());
        view.setVideoUrl(video.getVideoUrl());
        view.setCoverUrl(video.getCoverUrl());
        view.setDurationSeconds(video.getDurationSeconds());
        view.setSortNo(video.getSortNo());
        view.setStatus(video.getStatus());
        view.setCreatedAt(video.getCreatedAt());
        return view;
    }

    private PanoramaView toView(LabPanorama panorama, String labName) {
        PanoramaView view = new PanoramaView();
        view.setId(panorama.getId());
        view.setLabId(panorama.getLabId());
        view.setLabName(labName);
        view.setName(panorama.getName());
        view.setDescription(panorama.getDescription());
        view.setPanoramaType(panorama.getPanoramaType());
        view.setPanoramaUrl(panorama.getPanoramaUrl());
        view.setCoverUrl(panorama.getCoverUrl());
        view.setSortNo(panorama.getSortNo());
        view.setStatus(panorama.getStatus());
        view.setCreatedAt(panorama.getCreatedAt());
        return view;
    }
}
