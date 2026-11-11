package com.college.labselect.service;

import com.college.labselect.dto.req.MentorCreateReqDTO;
import com.college.labselect.dto.req.MentorQuotaReqDTO;
import com.college.labselect.dto.req.MentorStatusReqDTO;
import com.college.labselect.entity.Lab;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.entity.SysUser;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.LabMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.NoticeMapper;
import com.college.labselect.mapper.OperationLogMapper;
import com.college.labselect.mapper.SelectionRoundMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.service.impl.MentorServiceImpl;
import com.college.labselect.utils.StudentExcelParser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.mock.web.MockMultipartFile;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 导师与名额服务单元测试，阶段 3 以红灯作为阶段 4 的编码边界。
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class MentorServiceTest {

    @Mock
    private MentorProfileMapper mentorProfileMapper;

    @Mock
    private SysUserMapper sysUserMapper;

    @Mock
    private LabMapper labMapper;

    @Mock
    private SelectionRoundMapper selectionRoundMapper;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private OperationLogMapper operationLogMapper;

    @Mock
    private NoticeMapper noticeMapper;

    @Mock
    private StudentExcelParser studentExcelParser;

    @InjectMocks
    private MentorServiceImpl mentorService;

    /**
     * 快乐路径：负责人调整本室导师名额成功。
     */
    @Test
    void adjustQuotaByLeader_success_shouldUpdateQuota() {
        when(labMapper.selectOne(any())).thenReturn(lab());
        when(mentorProfileMapper.selectById(11L)).thenReturn(mentor());
        when(selectionRoundMapper.selectOne(any())).thenReturn(roundNotFrozen());
        when(mentorProfileMapper.updateById(any(MentorProfile.class))).thenReturn(1);

        mentorService.adjustQuotaByLeader(2001L, 11L, quotaReq(5));

        verify(mentorProfileMapper).updateById(any(MentorProfile.class));
    }

    /**
     * 边界：名额冻结后负责人调整返回 400004。
     */
    @Test
    void adjustQuotaByLeader_frozen_shouldThrow400004() {
        when(labMapper.selectOne(any())).thenReturn(lab());
        when(mentorProfileMapper.selectById(11L)).thenReturn(mentor());
        when(selectionRoundMapper.selectOne(any())).thenReturn(roundFrozen());

        BusinessException exception = catchThrowableOfType(
                () -> mentorService.adjustQuotaByLeader(2001L, 11L, quotaReq(5)), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400004);
    }

    /**
     * 边界：新名额小于已占用名额返回 400002。
     */
    @Test
    void adjustQuotaByLeader_lessThanUsed_shouldThrow400002() {
        when(labMapper.selectOne(any())).thenReturn(lab());
        when(mentorProfileMapper.selectById(11L)).thenReturn(mentor());
        when(selectionRoundMapper.selectOne(any())).thenReturn(roundNotFrozen());

        BusinessException exception = catchThrowableOfType(
                () -> mentorService.adjustQuotaByLeader(2001L, 11L, quotaReq(1)), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400002);
    }

    /**
     * 快乐路径：管理员强制调整名额成功。
     */
    @Test
    void forceAdjustQuota_success_shouldUpdateQuota() {
        when(mentorProfileMapper.selectById(11L)).thenReturn(mentor());
        when(labMapper.selectById(1L)).thenReturn(lab());
        when(mentorProfileMapper.updateById(any(MentorProfile.class))).thenReturn(1);

        mentorService.forceAdjustQuota(11L, quotaReq(6));

        verify(mentorProfileMapper).updateById(any(MentorProfile.class));
    }

    /**
     * 快乐路径：禁用教师同时更新账号状态。
     */
    @Test
    void updateStatus_disable_shouldUpdateAccountStatus() {
        when(mentorProfileMapper.selectById(11L)).thenReturn(mentor());
        when(sysUserMapper.selectById(2002L)).thenReturn(teacher());
        when(sysUserMapper.updateById(any(SysUser.class))).thenReturn(1);

        MentorStatusReqDTO req = new MentorStatusReqDTO();
        req.setStatus(0);
        mentorService.updateStatus(11L, req);

        verify(sysUserMapper).updateById(any(SysUser.class));
    }

    /**
     * 快乐路径：新增教师同时写入账号与导师档案。
     */
    @Test
    void createMentor_success_shouldInsertUserAndProfile() {
        when(sysUserMapper.selectCount(any())).thenReturn(0L);
        when(labMapper.selectById(1L)).thenReturn(lab());
        when(passwordEncoder.encode(anyString())).thenReturn("encoded");
        when(sysUserMapper.insert(any(SysUser.class))).thenAnswer(invocation -> {
            SysUser user = invocation.getArgument(0);
            user.setId(2003L);
            return 1;
        });
        when(mentorProfileMapper.insert(any(MentorProfile.class))).thenAnswer(invocation -> {
            MentorProfile profile = invocation.getArgument(0);
            profile.setId(11L);
            return 1;
        });
        MentorCreateReqDTO req = new MentorCreateReqDTO();
        req.setUserNo("T9003");
        req.setRealName("新导师");
        req.setLabId(1L);
        req.setQuota(4);
        req.setStatus(1);

        Long id = mentorService.createMentor(req);

        assertThat(id).isEqualTo(11L);
        verify(sysUserMapper).insert(any(SysUser.class));
        verify(mentorProfileMapper).insert(any(MentorProfile.class));
    }

    /**
     * 快乐路径：批量导入教师写入账号与导师档案。
     */
    @Test
    void importMentors_success_shouldInsertUserAndProfile() {
        StudentExcelParser.RawRow row = new StudentExcelParser.RawRow();
        row.setRowNo(2);
        row.setValues(new String[]{"T9003", "新导师", "LAB-AI-01", "副教授", "人工智能", "13800000001", "t@e.com"});
        when(studentExcelParser.parseRaw(any(), eq(7))).thenReturn(List.of(row));
        when(sysUserMapper.selectCount(any())).thenReturn(0L);
        when(labMapper.selectOne(any())).thenReturn(lab());
        when(passwordEncoder.encode(anyString())).thenReturn("encoded");
        when(sysUserMapper.insert(any(SysUser.class))).thenAnswer(invocation -> {
            SysUser user = invocation.getArgument(0);
            user.setId(2003L);
            return 1;
        });
        when(mentorProfileMapper.insert(any(MentorProfile.class))).thenReturn(1);

        mentorService.importMentors(new MockMultipartFile("file", "mentors.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", new byte[]{1}));

        verify(sysUserMapper).insert(any(SysUser.class));
        verify(mentorProfileMapper).insert(any(MentorProfile.class));
    }

    /**
     * 快乐路径：导出名额 Excel 返回字节流。
     */
    @Test
    void exportQuotas_shouldReturnXlsxBytes() {
        when(labMapper.selectList(any())).thenReturn(List.of(lab()));
        when(mentorProfileMapper.selectList(any())).thenReturn(List.of(mentor()));

        byte[] bytes = mentorService.exportQuotas();

        assertThat(bytes).isNotEmpty();
    }

    private Lab lab() {
        Lab lab = new Lab();
        lab.setId(1L);
        lab.setLabCode("LAB-AI-01");
        lab.setLabName("人工智能实训室");
        lab.setLeaderId(2001L);
        lab.setTotalQuota(20);
        return lab;
    }

    private MentorProfile mentor() {
        MentorProfile mentor = new MentorProfile();
        mentor.setId(11L);
        mentor.setUserId(2002L);
        mentor.setLabId(1L);
        mentor.setQuota(4);
        mentor.setQuotaUsed(2);
        return mentor;
    }

    private SysUser teacher() {
        SysUser user = new SysUser();
        user.setId(2002L);
        user.setUserNo("20010001");
        user.setRealName("李海峰");
        user.setUserType(2);
        user.setStatus(1);
        return user;
    }

    private SelectionRound roundNotFrozen() {
        SelectionRound round = new SelectionRound();
        round.setId(1L);
        round.setRoundNo(1);
        round.setApplyStart(LocalDateTime.now().plusDays(1));
        return round;
    }

    private SelectionRound roundFrozen() {
        SelectionRound round = new SelectionRound();
        round.setId(1L);
        round.setRoundNo(1);
        round.setApplyStart(LocalDateTime.now().minusDays(1));
        return round;
    }

    private MentorQuotaReqDTO quotaReq(int quota) {
        MentorQuotaReqDTO req = new MentorQuotaReqDTO();
        req.setQuota(quota);
        req.setReason("名额调整");
        return req;
    }
}
