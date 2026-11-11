package com.college.labselect.service;

import com.college.labselect.dto.req.LabSaveReqDTO;
import com.college.labselect.dto.req.LeaderAssignReqDTO;
import com.college.labselect.entity.Lab;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.LabMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.OperationLogMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.mapper.UserNoticeMapper;
import com.college.labselect.service.impl.LabServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 实训室服务单元测试，阶段 3 以红灯作为阶段 4 的编码边界。
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class LabServiceTest {

    @Mock
    private LabMapper labMapper;

    @Mock
    private MentorProfileMapper mentorProfileMapper;

    @Mock
    private SysUserMapper sysUserMapper;

    @Mock
    private OperationLogMapper operationLogMapper;

    @Mock
    private UserNoticeMapper userNoticeMapper;

    @InjectMocks
    private LabServiceImpl labService;

    /**
     * 快乐路径：新建实训室返回主键。
     */
    @Test
    void createLab_success_shouldReturnGeneratedId() {
        LabSaveReqDTO req = labReq();
        when(labMapper.insert(any(Lab.class))).thenAnswer(invocation -> {
            Lab lab = invocation.getArgument(0);
            lab.setId(101L);
            return 1;
        });

        Long id = labService.createLab(req);

        assertThat(id).isEqualTo(101L);
        verify(labMapper).insert(any(Lab.class));
    }

    /**
     * 边界：修改不存在的实训室返回 404001。
     */
    @Test
    void updateLab_notFound_shouldThrow404001() {
        when(labMapper.selectById(99L)).thenReturn(null);

        BusinessException exception = catchThrowableOfType(
                () -> labService.updateLab(99L, labReq()), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(404001);
    }

    /**
     * 边界：提拔的导师不属于本室返回 403001。
     */
    @Test
    void assignLeader_mentorNotInLab_shouldThrow403001() {
        when(labMapper.selectById(1L)).thenReturn(lab(1L));
        when(mentorProfileMapper.selectOne(any())).thenReturn(null);

        LeaderAssignReqDTO req = new LeaderAssignReqDTO();
        req.setUserId(2001L);
        req.setReason("教研室推荐");

        BusinessException exception = catchThrowableOfType(
                () -> labService.assignLeader(1L, req), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(403001);
    }

    /**
     * 边界：实训室仍有导师时不允许删除，返回 400002。
     */
    @Test
    void deleteLab_hasMentors_shouldThrow400002() {
        when(labMapper.selectById(1L)).thenReturn(lab(1L));
        when(mentorProfileMapper.selectCount(any())).thenReturn(3L);

        BusinessException exception = catchThrowableOfType(
                () -> labService.deleteLab(1L), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400002);
    }

    /**
     * 快乐路径：提拔本室导师为负责人并留痕。
     */
    @Test
    void assignLeader_success_shouldUpdateLabAndWriteLog() {
        Lab lab = lab(1L);
        lab.setLeaderId(2000L);
        when(labMapper.selectById(1L)).thenReturn(lab);
        com.college.labselect.entity.MentorProfile mentor = new com.college.labselect.entity.MentorProfile();
        mentor.setId(11L);
        mentor.setUserId(2001L);
        mentor.setLabId(1L);
        when(mentorProfileMapper.selectOne(any())).thenReturn(mentor);
        com.college.labselect.entity.SysUser user = new com.college.labselect.entity.SysUser();
        user.setId(2001L);
        user.setUserType(2);
        user.setStatus(1);
        when(sysUserMapper.selectById(2001L)).thenReturn(user);

        LeaderAssignReqDTO req = new LeaderAssignReqDTO();
        req.setUserId(2001L);
        req.setReason("教研室推荐");
        labService.assignLeader(1L, req);

        verify(labMapper).updateById(any(Lab.class));
        verify(operationLogMapper).insert(any(com.college.labselect.entity.OperationLog.class));
    }

    private Lab lab(Long id) {
        Lab lab = new Lab();
        lab.setId(id);
        lab.setLabCode("LAB-AI-01");
        lab.setLabName("人工智能实训室");
        lab.setTotalQuota(20);
        lab.setStatus(1);
        return lab;
    }

    private LabSaveReqDTO labReq() {
        LabSaveReqDTO req = new LabSaveReqDTO();
        req.setLabCode("LAB-AI-01");
        req.setLabName("人工智能实训室");
        req.setResearchDirection("计算机视觉、大模型应用");
        req.setOpenDayDate(LocalDate.of(2026, 10, 29));
        req.setTotalQuota(20);
        req.setStatus(1);
        return req;
    }
}
