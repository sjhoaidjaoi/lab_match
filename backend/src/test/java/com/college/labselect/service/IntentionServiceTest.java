package com.college.labselect.service;

import com.college.labselect.common.PageResult;
import com.college.labselect.dto.req.IntentionItemReqDTO;
import com.college.labselect.dto.req.IntentionSaveReqDTO;
import com.college.labselect.dto.resp.AvailableMentorVO;
import com.college.labselect.dto.resp.IntentionRespVO;
import com.college.labselect.dto.resp.IntentionSaveRespVO;
import com.college.labselect.entity.Intention;
import com.college.labselect.entity.IntentionItem;
import com.college.labselect.entity.Lab;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.entity.StudentProfile;
import com.college.labselect.entity.SysUser;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.IntentionItemMapper;
import com.college.labselect.mapper.IntentionMapper;
import com.college.labselect.mapper.LabMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.SelectionRoundMapper;
import com.college.labselect.mapper.StudentProfileMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.mapper.UserNoticeMapper;
import com.college.labselect.service.impl.IntentionServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * 意向填报服务单元测试，阶段 3 以红灯作为阶段 4 的编码边界。
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class IntentionServiceTest {

    @Mock
    private IntentionMapper intentionMapper;

    @Mock
    private IntentionItemMapper intentionItemMapper;

    @Mock
    private StudentProfileMapper studentProfileMapper;

    @Mock
    private MentorProfileMapper mentorProfileMapper;

    @Mock
    private SysUserMapper sysUserMapper;

    @Mock
    private LabMapper labMapper;

    @Mock
    private SelectionRoundMapper selectionRoundMapper;

    @Mock
    private UserNoticeMapper userNoticeMapper;

    @InjectMocks
    private IntentionServiceImpl intentionService;

    /**
     * 边界：提交时 0 个意向返回 400001。
     */
    @Test
    void saveIntention_submitWithZeroItems_shouldThrow400001() {
        IntentionSaveReqDTO req = intentionReq(0);
        req.setSubmit(1);
        mockActiveRound();

        BusinessException exception = catchThrowableOfType(
                () -> intentionService.saveIntention(1001L, req), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400001);
    }

    /**
     * 快乐路径：0 个意向允许保存为草稿。
     */
    @Test
    void saveIntention_draftWithZeroItems_shouldReturnDraftStatus() {
        IntentionSaveReqDTO req = intentionReq(0);
        mockActiveRound();
        when(intentionMapper.selectOne(any())).thenReturn(null);
        when(intentionMapper.insert(any(Intention.class))).thenAnswer(invocation -> {
            Intention intention = invocation.getArgument(0);
            intention.setId(501L);
            return 1;
        });

        IntentionSaveRespVO result = intentionService.saveIntention(1001L, req);

        assertThat(result.getId()).isEqualTo(501L);
        assertThat(result.getStatus()).isEqualTo(1);
    }

    /**
     * 边界：首轮超过 3 个意向返回 400002。
     */
    @Test
    void saveIntention_moreThanThreeItems_shouldThrow400002() {
        IntentionSaveReqDTO req = intentionReq(4);
        mockActiveRound();

        BusinessException exception = catchThrowableOfType(
                () -> intentionService.saveIntention(1001L, req), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400002);
    }

    /**
     * 边界：存在重复导师返回 400002。
     */
    @Test
    void saveIntention_duplicateMentors_shouldThrow400002() {
        IntentionSaveReqDTO req = intentionReq(1);
        req.getItems().add(req.getItems().get(0));
        mockActiveRound();

        BusinessException exception = catchThrowableOfType(
                () -> intentionService.saveIntention(1001L, req), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400002);
    }

    /**
     * 边界：提交时档案必填项未完成返回 400002。
     */
    @Test
    void saveIntention_submitWithIncompleteArchive_shouldThrow400002() {
        IntentionSaveReqDTO req = intentionReq(1);
        req.setSubmit(1);
        mockActiveRound();
        when(studentProfileMapper.selectOne(any())).thenReturn(new StudentProfile());

        BusinessException exception = catchThrowableOfType(
                () -> intentionService.saveIntention(1001L, req), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400002);
    }

    /**
     * 边界：不在填报时间窗返回 400004。
     */
    @Test
    void saveIntention_outOfWindow_shouldThrow400004() {
        IntentionSaveReqDTO req = intentionReq(1);
        SelectionRound round = activeRound();
        round.setApplyEnd(LocalDateTime.now().minusMinutes(1));
        when(selectionRoundMapper.selectById(1L)).thenReturn(round);

        BusinessException exception = catchThrowableOfType(
                () -> intentionService.saveIntention(1001L, req), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400004);
    }

    /**
     * 快乐路径：保存草稿返回 ID 与草稿状态。
     */
    @Test
    void saveIntention_draft_shouldReturnIdAndDraftStatus() {
        IntentionSaveReqDTO req = intentionReq(2);
        mockActiveRound();
        when(studentProfileMapper.selectOne(any())).thenReturn(completeProfile());
        when(mentorProfileMapper.selectById(any())).thenReturn(mentor());
        when(intentionMapper.selectOne(any())).thenReturn(null);
        when(intentionMapper.insert(any(Intention.class))).thenAnswer(invocation -> {
            Intention intention = invocation.getArgument(0);
            intention.setId(501L);
            return 1;
        });
        when(intentionItemMapper.insert(any(IntentionItem.class))).thenReturn(1);

        IntentionSaveRespVO result = intentionService.saveIntention(1001L, req);

        assertThat(result.getId()).isEqualTo(501L);
        assertThat(result.getStatus()).isEqualTo(1);
    }

    /**
     * 快乐路径：提交后状态置 2。
     */
    @Test
    void saveIntention_submit_shouldReturnSubmittedStatus() {
        IntentionSaveReqDTO req = intentionReq(2);
        req.setSubmit(1);
        mockActiveRound();
        when(studentProfileMapper.selectOne(any())).thenReturn(completeProfile());
        when(mentorProfileMapper.selectById(any())).thenReturn(mentor());
        when(intentionMapper.selectOne(any())).thenReturn(null);
        when(intentionMapper.insert(any(Intention.class))).thenAnswer(invocation -> {
            Intention intention = invocation.getArgument(0);
            intention.setId(501L);
            return 1;
        });
        when(intentionItemMapper.insert(any(IntentionItem.class))).thenReturn(1);

        IntentionSaveRespVO result = intentionService.saveIntention(1001L, req);

        assertThat(result.getId()).isEqualTo(501L);
        assertThat(result.getStatus()).isEqualTo(2);
    }

    /**
     * 边界：未填报时详情返回 null。
     */
    @Test
    void getIntention_notFound_shouldReturnNull() {
        when(selectionRoundMapper.selectById(1L)).thenReturn(activeRound());
        when(intentionMapper.selectOne(any())).thenReturn(null);

        IntentionRespVO result = intentionService.getIntention(1001L, 1L);

        assertThat(result).isNull();
    }

    /**
     * 快乐路径：详情返回状态、可编辑标记与导师信息。
     */
    @Test
    void getIntention_shouldReturnDetail() {
        when(selectionRoundMapper.selectById(1L)).thenReturn(activeRound());
        when(intentionMapper.selectOne(any())).thenReturn(intention(501L, 1001L));
        when(intentionItemMapper.selectList(any())).thenReturn(List.of(intentionItem(501L, 11L)));
        when(mentorProfileMapper.selectBatchIds(any())).thenReturn(List.of(mentor()));
        when(sysUserMapper.selectBatchIds(any())).thenReturn(List.of(user(2001L, "李海峰")));
        when(labMapper.selectBatchIds(any())).thenReturn(List.of(lab()));

        IntentionRespVO result = intentionService.getIntention(1001L, 1L);

        assertThat(result.getStatus()).isEqualTo(2);
        assertThat(result.getStatusText()).isEqualTo("已提交");
        assertThat(result.getEditable()).isEqualTo(1);
        assertThat(result.getItems()).hasSize(1);
        assertThat(result.getItems().get(0).getMentorName()).isEqualTo("李海峰");
        assertThat(result.getItems().get(0).getRemainQuota()).isEqualTo(2);
    }

    /**
     * 快乐路径：仅显示有剩余名额时过滤已满导师。
     */
    @Test
    void pageAvailableMentors_shouldFilterFullMentor() {
        MentorProfile full = mentor();
        full.setId(12L);
        full.setUserId(2002L);
        full.setQuota(2);
        full.setQuotaUsed(2);
        when(mentorProfileMapper.selectList(any())).thenReturn(List.of(mentor(), full));
        when(sysUserMapper.selectBatchIds(any())).thenReturn(List.of(
                user(2001L, "李海峰"), user(2002L, "王建国")));
        when(labMapper.selectBatchIds(any())).thenReturn(List.of(lab()));

        PageResult<AvailableMentorVO> result =
                intentionService.pageAvailableMentors(null, 1L, 1, 1, 10);

        assertThat(result.getTotal()).isEqualTo(1);
        assertThat(result.getList()).hasSize(1);
        assertThat(result.getList().get(0).getMentorId()).isEqualTo(11L);
        assertThat(result.getList().get(0).getSelectable()).isEqualTo(1);
    }

    private IntentionSaveReqDTO intentionReq(int count) {
        IntentionSaveReqDTO req = new IntentionSaveReqDTO();
        req.setRoundId(1L);
        req.setAcceptInnerAdjust(0);
        req.setAcceptCrossAdjust(0);
        req.setPoolConsent(0);
        req.setSubmit(0);
        List<IntentionItemReqDTO> items = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            IntentionItemReqDTO item = new IntentionItemReqDTO();
            item.setMentorId(11L + i);
            items.add(item);
        }
        req.setItems(items);
        return req;
    }

    private void mockActiveRound() {
        when(selectionRoundMapper.selectById(1L)).thenReturn(activeRound());
    }

    private SelectionRound activeRound() {
        SelectionRound round = new SelectionRound();
        round.setId(1L);
        round.setRoundNo(1);
        round.setStatus(2);
        round.setApplyStart(LocalDateTime.now().minusHours(1));
        round.setApplyEnd(LocalDateTime.now().plusHours(1));
        return round;
    }

    private StudentProfile completeProfile() {
        StudentProfile profile = new StudentProfile();
        profile.setId(1L);
        profile.setUserId(1001L);
        profile.setProgrammingLanguages("Java,Python");
        profile.setProjectExperience("主导过校园二手交易平台后端开发");
        profile.setWeeklyHours(12);
        profile.setAvailableSlots("工作日 19:00-22:00，周末全天");
        profile.setStatement("我".repeat(320));
        return profile;
    }

    private MentorProfile mentor() {
        MentorProfile mentor = new MentorProfile();
        mentor.setId(11L);
        mentor.setUserId(2001L);
        mentor.setLabId(1L);
        mentor.setQuota(4);
        mentor.setQuotaUsed(2);
        return mentor;
    }

    private Intention intention(Long id, Long studentId) {
        Intention intention = new Intention();
        intention.setId(id);
        intention.setRoundId(1L);
        intention.setStudentId(studentId);
        intention.setStatus(2);
        intention.setAcceptInnerAdjust(1);
        intention.setAcceptCrossAdjust(0);
        intention.setPoolConsent(1);
        return intention;
    }

    private IntentionItem intentionItem(Long intentionId, Long mentorId) {
        IntentionItem item = new IntentionItem();
        item.setId(1L);
        item.setIntentionId(intentionId);
        item.setMentorId(mentorId);
        item.setLabId(1L);
        return item;
    }

    private SysUser user(Long id, String realName) {
        SysUser user = new SysUser();
        user.setId(id);
        user.setRealName(realName);
        user.setTitle("副教授");
        return user;
    }

    private Lab lab() {
        Lab lab = new Lab();
        lab.setId(1L);
        lab.setLabName("人工智能实训室");
        return lab;
    }
}
