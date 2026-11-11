package com.college.labselect.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.college.labselect.common.PageResult;
import com.college.labselect.common.ResultCode;
import com.college.labselect.common.StatusTextUtils;
import com.college.labselect.dto.req.NoticeSaveReqDTO;
import com.college.labselect.dto.req.NoticeStatusReqDTO;
import com.college.labselect.dto.resp.NoticeAdminVO;
import com.college.labselect.dto.resp.PublicNoticeVO;
import com.college.labselect.entity.Notice;
import com.college.labselect.entity.SysUser;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.NoticeMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.service.INoticeManageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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

    private final NoticeMapper noticeMapper;

    private final SysUserMapper sysUserMapper;

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
