package com.college.labselect.service;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.college.labselect.dto.req.NoticeSaveReqDTO;
import com.college.labselect.dto.req.NoticeStatusReqDTO;
import com.college.labselect.dto.resp.NoticeAdminVO;
import com.college.labselect.dto.resp.PublicNoticeVO;
import com.college.labselect.entity.Notice;
import com.college.labselect.entity.SysUser;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.NoticeMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.service.impl.NoticeManageServiceImpl;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 公告管理服务单元测试，阶段 3 以红灯作为阶段 4 的编码边界。
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class NoticeManageServiceTest {

    /**
     * 单元测试无 MyBatis 容器，手动初始化实体元数据以支持 Lambda 条件解析。
     */
    @BeforeAll
    static void initTableInfo() {
        TableInfoHelper.initTableInfo(new MapperBuilderAssistant(new MybatisConfiguration(), ""), Notice.class);
    }

    @Mock
    private NoticeMapper noticeMapper;

    @Mock
    private SysUserMapper sysUserMapper;

    @InjectMocks
    private NoticeManageServiceImpl noticeManageService;

    /**
     * 快乐路径：新建草稿不写发布时间，状态落 1。
     */
    @Test
    void createNotice_draft_shouldInsertWithoutPublishTime() {
        when(noticeMapper.insert(any(Notice.class))).thenReturn(1);

        NoticeAdminVO result = noticeManageService.createNotice(9001L, req(1, 1));

        ArgumentCaptor<Notice> captor = ArgumentCaptor.forClass(Notice.class);
        verify(noticeMapper).insert(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(1);
        assertThat(captor.getValue().getPublishTime()).isNull();
        assertThat(captor.getValue().getPublisherId()).isEqualTo(9001L);
        assertThat(result.getStatusText()).isEqualTo("草稿");
    }

    /**
     * 快乐路径：新建并直接发布时写入发布时间，状态落 2。
     */
    @Test
    void createNotice_published_shouldStampPublishTime() {
        when(noticeMapper.insert(any(Notice.class))).thenReturn(1);

        NoticeAdminVO result = noticeManageService.createNotice(9001L, req(1, 2));

        ArgumentCaptor<Notice> captor = ArgumentCaptor.forClass(Notice.class);
        verify(noticeMapper).insert(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(2);
        assertThat(captor.getValue().getPublishTime()).isNotNull();
        assertThat(result.getStatusText()).isEqualTo("已发布");
    }

    /**
     * 边界：公告类型不在 1–4 范围返回 400001。
     */
    @Test
    void createNotice_invalidType_shouldThrow400001() {
        BusinessException exception = catchThrowableOfType(
                () -> noticeManageService.createNotice(9001L, req(5, 1)), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400001);
    }

    /**
     * 边界：编辑不存在的公告返回 404001。
     */
    @Test
    void updateNotice_missing_shouldThrow404001() {
        when(noticeMapper.selectById(1L)).thenReturn(null);

        BusinessException exception = catchThrowableOfType(
                () -> noticeManageService.updateNotice(1L, req(1, 1)), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(404001);
    }

    /**
     * 快乐路径：草稿发布后状态置 2 并补写发布时间。
     */
    @Test
    void updateStatus_publishDraft_shouldStampPublishTime() {
        when(noticeMapper.selectById(1L)).thenReturn(notice(1L, 1, null));

        NoticeStatusReqDTO req = new NoticeStatusReqDTO();
        req.setStatus(2);
        noticeManageService.updateStatus(1L, req);

        ArgumentCaptor<Notice> captor = ArgumentCaptor.forClass(Notice.class);
        verify(noticeMapper).updateById(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(2);
        assertThat(captor.getValue().getPublishTime()).isNotNull();
    }

    /**
     * 边界：草稿未发布不允许直接下线，返回 400005。
     */
    @Test
    void updateStatus_offlineDraft_shouldThrow400005() {
        when(noticeMapper.selectById(1L)).thenReturn(notice(1L, 1, null));

        NoticeStatusReqDTO req = new NoticeStatusReqDTO();
        req.setStatus(3);
        BusinessException exception = catchThrowableOfType(
                () -> noticeManageService.updateStatus(1L, req), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400005);
    }

    /**
     * 快乐路径：已发布公告下线后状态置 3，发布时间保持原值。
     */
    @Test
    void updateStatus_offlinePublished_shouldKeepPublishTime() {
        LocalDateTime publishedAt = LocalDateTime.of(2026, 11, 1, 9, 0);
        when(noticeMapper.selectById(1L)).thenReturn(notice(1L, 2, publishedAt));

        NoticeStatusReqDTO req = new NoticeStatusReqDTO();
        req.setStatus(3);
        noticeManageService.updateStatus(1L, req);

        ArgumentCaptor<Notice> captor = ArgumentCaptor.forClass(Notice.class);
        verify(noticeMapper).updateById(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(3);
        assertThat(captor.getValue().getPublishTime()).isEqualTo(publishedAt);
    }

    /**
     * 快乐路径：管理端列表回填类型、状态文本与发布人姓名。
     */
    @Test
    void pageAdminNotices_shouldFillTextsAndPublisherName() {
        Page<Notice> page = new Page<>(1, 10);
        page.setRecords(List.of(notice(1L, 2, LocalDateTime.of(2026, 11, 1, 9, 0))));
        page.setTotal(1);
        when(noticeMapper.selectPage(any(), any())).thenReturn(page);
        when(sysUserMapper.selectBatchIds(any())).thenReturn(List.of(admin()));

        com.college.labselect.common.PageResult<NoticeAdminVO> result =
                noticeManageService.pageAdminNotices(null, null, null, 1, 10);

        assertThat(result.getTotal()).isEqualTo(1);
        assertThat(result.getList()).hasSize(1);
        assertThat(result.getList().get(0).getNoticeTypeText()).isEqualTo("宣讲");
        assertThat(result.getList().get(0).getStatusText()).isEqualTo("已发布");
        assertThat(result.getList().get(0).getPublisherName()).isEqualTo("系统管理员");
    }

    /**
     * 公共端列表只查询已发布公告。
     */
    @Test
    @SuppressWarnings("unchecked")
    void pagePublicNotices_shouldOnlyQueryPublished() {
        Page<Notice> page = new Page<>(1, 10);
        page.setRecords(List.of(notice(1L, 2, LocalDateTime.of(2026, 11, 1, 9, 0))));
        page.setTotal(1);
        when(noticeMapper.selectPage(any(), any())).thenReturn(page);

        com.college.labselect.common.PageResult<PublicNoticeVO> result =
                noticeManageService.pagePublicNotices(null, 1, 10);

        assertThat(result.getList()).hasSize(1);
        ArgumentCaptor<Wrapper<Notice>> captor = ArgumentCaptor.forClass(Wrapper.class);
        verify(noticeMapper).selectPage(any(), captor.capture());
        LambdaQueryWrapper<Notice> wrapper = (LambdaQueryWrapper<Notice>) captor.getValue();
        assertThat(wrapper.getParamNameValuePairs()).containsValue(2);
    }

    /**
     * 边界：公共端访问草稿公告返回 404001。
     */
    @Test
    void getPublicNotice_draft_shouldThrow404001() {
        when(noticeMapper.selectById(1L)).thenReturn(notice(1L, 1, null));

        BusinessException exception = catchThrowableOfType(
                () -> noticeManageService.getPublicNotice(1L), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(404001);
    }

    /**
     * 快乐路径：公共端可读取已发布公告正文。
     */
    @Test
    void getPublicNotice_published_shouldReturnContent() {
        when(noticeMapper.selectById(1L)).thenReturn(notice(1L, 2, LocalDateTime.of(2026, 11, 1, 9, 0)));

        PublicNoticeVO result = noticeManageService.getPublicNotice(1L);

        assertThat(result.getTitle()).isEqualTo("集中宣讲通知");
        assertThat(result.getContent()).isEqualTo("宣讲时间与地点已确定。");
        assertThat(result.getPublishTime()).isNotNull();
    }

    private NoticeSaveReqDTO req(int type, int status) {
        NoticeSaveReqDTO req = new NoticeSaveReqDTO();
        req.setTitle("集中宣讲通知");
        req.setNoticeType(type);
        req.setContent("宣讲时间与地点已确定。");
        req.setStatus(status);
        return req;
    }

    private Notice notice(Long id, int status, LocalDateTime publishTime) {
        Notice notice = new Notice();
        notice.setId(id);
        notice.setTitle("集中宣讲通知");
        notice.setNoticeType(1);
        notice.setContent("宣讲时间与地点已确定。");
        notice.setStatus(status);
        notice.setPublishTime(publishTime);
        notice.setPublisherId(9001L);
        return notice;
    }

    private SysUser admin() {
        SysUser user = new SysUser();
        user.setId(9001L);
        user.setUserNo("admin");
        user.setRealName("系统管理员");
        user.setUserType(3);
        return user;
    }
}
