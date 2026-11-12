package com.college.labselect.service.impl;

import cn.hutool.core.io.FileUtil;
import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.college.labselect.common.PageResult;
import com.college.labselect.common.ResultCode;
import com.college.labselect.common.StatusTextUtils;
import com.college.labselect.dto.req.NoticeSaveReqDTO;
import com.college.labselect.dto.req.NoticeStatusReqDTO;
import com.college.labselect.dto.resp.NoticeAdminVO;
import com.college.labselect.dto.resp.NoticeAttachmentVO;
import com.college.labselect.dto.resp.PublicNoticeVO;
import com.college.labselect.entity.Notice;
import com.college.labselect.entity.SysUser;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.NoticeMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.service.INoticeManageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 公告管理服务实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NoticeManageServiceImpl implements INoticeManageService {

    private static final int STATUS_DRAFT = 1;
    private static final int STATUS_PUBLISHED = 2;
    private static final int STATUS_OFFLINE = 3;
    private static final int TYPE_MIN = 1;
    private static final int TYPE_MAX = 4;
    private static final long MAX_PAGE_SIZE = 100L;
    private static final long MAX_ATTACHMENT_SIZE = 10L * 1024 * 1024;
    private static final String FILE_URL_PREFIX = "/api/v1/files/";
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "zip", "rar", "png", "jpg", "jpeg");
    private static final DateTimeFormatter DATE_DIR_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final NoticeMapper noticeMapper;

    private final SysUserMapper sysUserMapper;

    /**
     * 上传文件根目录。
     */
    @Value("${lab-select.upload-dir:./uploads}")
    private String uploadDir;

    @Override
    public PageResult<NoticeAdminVO> pageAdminNotices(String keyword, Integer noticeType, Integer status,
                                                      long pageNum, long pageSize) {
        long safePage = Math.max(1, pageNum);
        long safeSize = pageSize < 1 ? 10 : Math.min(pageSize, MAX_PAGE_SIZE);
        Page<Notice> page = new Page<>(safePage, safeSize);
        LambdaQueryWrapper<Notice> wrapper = new LambdaQueryWrapper<Notice>()
                .like(StrUtil.isNotBlank(keyword), Notice::getTitle, StrUtil.trim(keyword))
                .eq(noticeType != null, Notice::getNoticeType, noticeType)
                .eq(status != null, Notice::getStatus, status)
                .orderByDesc(Notice::getId);
        Page<Notice> result = noticeMapper.selectPage(page, wrapper);
        Map<Long, SysUser> publisherMap = loadUsers(result.getRecords().stream()
                .map(Notice::getPublisherId).distinct().toList());
        List<NoticeAdminVO> list = new ArrayList<>();
        for (Notice notice : result.getRecords()) {
            list.add(toAdminVO(notice, publisherMap.get(notice.getPublisherId())));
        }
        return new PageResult<>(result.getTotal(), safePage, safeSize, list);
    }

    @Override
    public NoticeAdminVO createNotice(Long adminUserId, NoticeSaveReqDTO req) {
        validateType(req.getNoticeType());
        int status = req.getStatus() == null ? STATUS_DRAFT : req.getStatus();
        if (status < STATUS_DRAFT || status > STATUS_PUBLISHED) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "公告状态不合法");
        }
        Notice notice = new Notice();
        notice.setTitle(StrUtil.trim(req.getTitle()));
        notice.setNoticeType(req.getNoticeType());
        notice.setContent(req.getContent());
        notice.setAttachmentUrl(StrUtil.trim(req.getAttachmentUrl()));
        notice.setStatus(status);
        notice.setPublisherId(adminUserId);
        if (status == STATUS_PUBLISHED) {
            notice.setPublishTime(LocalDateTime.now().withNano(0));
        }
        noticeMapper.insert(notice);
        log.info("新建公告，noticeId={}，status={}", notice.getId(), status);
        return toAdminVO(notice, sysUserMapper.selectById(adminUserId));
    }

    @Override
    public void updateNotice(Long id, NoticeSaveReqDTO req) {
        Notice notice = requireNotice(id);
        validateType(req.getNoticeType());
        notice.setTitle(StrUtil.trim(req.getTitle()));
        notice.setNoticeType(req.getNoticeType());
        notice.setContent(req.getContent());
        notice.setAttachmentUrl(StrUtil.trim(req.getAttachmentUrl()));
        noticeMapper.updateById(notice);
    }

    @Override
    public void updateStatus(Long id, NoticeStatusReqDTO req) {
        Notice notice = requireNotice(id);
        Integer target = req.getStatus();
        if (target == null || (target != STATUS_PUBLISHED && target != STATUS_OFFLINE)) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "公告状态不合法");
        }
        if (target == STATUS_OFFLINE
                && !Integer.valueOf(STATUS_PUBLISHED).equals(notice.getStatus())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "仅已发布公告可下线");
        }
        if (target == STATUS_PUBLISHED && notice.getPublishTime() == null) {
            notice.setPublishTime(LocalDateTime.now().withNano(0));
        }
        notice.setStatus(target);
        noticeMapper.updateById(notice);
        log.info("更新公告状态，noticeId={}，status={}", id, target);
    }

    @Override
    public NoticeAttachmentVO uploadAttachment(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "请选择需要上传的附件");
        }
        if (file.getSize() > MAX_ATTACHMENT_SIZE) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "附件大小不能超过 10MB");
        }
        String originalName = StrUtil.trim(file.getOriginalFilename());
        String extension = FileUtil.extName(originalName).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "不支持的附件类型");
        }
        String dateDir = LocalDate.now().format(DATE_DIR_FORMATTER);
        String storedName = IdUtil.fastSimpleUUID() + "." + extension;
        Path targetDir = Paths.get(uploadDir, "notice", dateDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(targetDir);
            file.transferTo(targetDir.resolve(storedName).toFile());
        } catch (IOException e) {
            log.error("公告附件写入失败，fileName={}", originalName, e);
            throw new BusinessException(ResultCode.SERVER_ERROR, "附件上传失败");
        }
        NoticeAttachmentVO vo = new NoticeAttachmentVO();
        vo.setFileName(StrUtil.blankToDefault(originalName, storedName));
        vo.setUrl(FILE_URL_PREFIX + "notice/" + dateDir + "/" + storedName);
        log.info("公告附件上传成功，fileName={}，size={}", originalName, file.getSize());
        return vo;
    }

    @Override
    public void deleteNotice(Long id) {
        Notice notice = requireNotice(id);
        if (Integer.valueOf(STATUS_PUBLISHED).equals(notice.getStatus())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "已发布公告请先下线再删除");
        }
        noticeMapper.deleteById(id);
        removeAttachment(notice.getAttachmentUrl());
        log.info("删除公告，noticeId={}", id);
    }

    /**
     * 清理本系统存储的附件文件，外部地址不处理。
     *
     * @param attachmentUrl 附件地址
     */
    private void removeAttachment(String attachmentUrl) {
        if (StrUtil.isBlank(attachmentUrl) || !attachmentUrl.startsWith(FILE_URL_PREFIX)) {
            return;
        }
        String relative = attachmentUrl.substring(FILE_URL_PREFIX.length());
        Path root = Paths.get(uploadDir).toAbsolutePath().normalize();
        Path target = root.resolve(relative).normalize();
        if (!target.startsWith(root)) {
            log.warn("附件路径非法，跳过清理，attachmentUrl={}", attachmentUrl);
            return;
        }
        try {
            Files.deleteIfExists(target);
        } catch (IOException e) {
            log.warn("附件文件清理失败，attachmentUrl={}", attachmentUrl, e);
        }
    }

    @Override
    public PageResult<PublicNoticeVO> pagePublicNotices(Integer noticeType, long pageNum, long pageSize) {
        long safePage = Math.max(1, pageNum);
        long safeSize = pageSize < 1 ? 10 : Math.min(pageSize, MAX_PAGE_SIZE);
        Page<Notice> page = new Page<>(safePage, safeSize);
        LambdaQueryWrapper<Notice> wrapper = new LambdaQueryWrapper<Notice>()
                .eq(Notice::getStatus, STATUS_PUBLISHED)
                .eq(noticeType != null, Notice::getNoticeType, noticeType)
                .orderByDesc(Notice::getPublishTime)
                .orderByDesc(Notice::getId);
        wrapper.getSqlSegment();
        Page<Notice> result = noticeMapper.selectPage(page, wrapper);
        List<PublicNoticeVO> list = result.getRecords().stream().map(this::toPublicVO).toList();
        return new PageResult<>(result.getTotal(), safePage, safeSize, new ArrayList<>(list));
    }

    @Override
    public PublicNoticeVO getPublicNotice(Long id) {
        Notice notice = noticeMapper.selectById(id);
        if (notice == null || !Integer.valueOf(STATUS_PUBLISHED).equals(notice.getStatus())) {
            throw new BusinessException(ResultCode.NOT_FOUND, "公告不存在或未发布");
        }
        return toPublicVO(notice);
    }

    /**
     * 校验公告类型。
     *
     * @param noticeType 公告类型
     */
    private void validateType(Integer noticeType) {
        if (noticeType == null || noticeType < TYPE_MIN || noticeType > TYPE_MAX) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "公告类型不合法");
        }
    }

    /**
     * 查询公告，不存在时抛 404001。
     *
     * @param id 公告 ID
     * @return 公告
     */
    private Notice requireNotice(Long id) {
        Notice notice = noticeMapper.selectById(id);
        if (notice == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "公告不存在");
        }
        return notice;
    }

    /**
     * 转管理端公告 VO。
     *
     * @param notice    公告
     * @param publisher 发布人
     * @return 管理端 VO
     */
    private NoticeAdminVO toAdminVO(Notice notice, SysUser publisher) {
        NoticeAdminVO vo = new NoticeAdminVO();
        vo.setId(notice.getId());
        vo.setTitle(notice.getTitle());
        vo.setNoticeType(notice.getNoticeType());
        vo.setNoticeTypeText(StatusTextUtils.noticeType(notice.getNoticeType()));
        vo.setContent(notice.getContent());
        vo.setAttachmentUrl(notice.getAttachmentUrl());
        vo.setStatus(notice.getStatus());
        vo.setStatusText(StatusTextUtils.noticeStatus(notice.getStatus()));
        vo.setPublishTime(notice.getPublishTime());
        vo.setPublisherId(notice.getPublisherId());
        vo.setPublisherName(publisher == null ? "" : publisher.getRealName());
        vo.setGmtCreate(notice.getGmtCreate());
        vo.setGmtModified(notice.getGmtModified());
        return vo;
    }

    /**
     * 转公共端公告 VO。
     *
     * @param notice 公告
     * @return 公共端 VO
     */
    private PublicNoticeVO toPublicVO(Notice notice) {
        PublicNoticeVO vo = new PublicNoticeVO();
        vo.setId(notice.getId());
        vo.setTitle(notice.getTitle());
        vo.setNoticeType(notice.getNoticeType());
        vo.setNoticeTypeText(StatusTextUtils.noticeType(notice.getNoticeType()));
        vo.setContent(notice.getContent());
        vo.setAttachmentUrl(notice.getAttachmentUrl());
        vo.setPublicityId(Integer.valueOf(3).equals(notice.getNoticeType()) ? notice.getBizId() : null);
        vo.setPublishTime(notice.getPublishTime());
        return vo;
    }

    /**
     * 批量加载用户。
     *
     * @param userIds 用户 ID 列表
     * @return 用户映射
     */
    private Map<Long, SysUser> loadUsers(List<Long> userIds) {
        if (userIds.isEmpty()) {
            return new HashMap<>();
        }
        return sysUserMapper.selectBatchIds(userIds).stream()
                .collect(Collectors.toMap(SysUser::getId, Function.identity(), (first, second) -> first));
    }
}
