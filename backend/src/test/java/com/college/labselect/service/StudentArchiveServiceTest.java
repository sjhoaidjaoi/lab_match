package com.college.labselect.service;

import com.college.labselect.dto.req.StudentArchiveSaveReqDTO;
import com.college.labselect.dto.resp.StudentArchiveRespVO;
import com.college.labselect.dto.resp.StudentArchiveSaveRespVO;
import com.college.labselect.entity.StudentProfile;
import com.college.labselect.entity.SysUser;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.StudentProfileMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.service.impl.StudentArchiveServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * 学生档案服务单元测试，阶段 3 以红灯作为阶段 4 的编码边界。
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class StudentArchiveServiceTest {

    @Mock
    private StudentProfileMapper studentProfileMapper;

    @Mock
    private SysUserMapper sysUserMapper;

    @InjectMocks
    private StudentArchiveServiceImpl studentArchiveService;

    /**
     * 快乐路径：档案完整时 missingFields 为空。
     */
    @Test
    void getArchive_completeProfile_shouldReturnNoMissingFields() {
        when(sysUserMapper.selectById(1001L)).thenReturn(student());
        when(studentProfileMapper.selectOne(any())).thenReturn(profile());

        StudentArchiveRespVO result = studentArchiveService.getArchive(1001L);

        assertThat(result.getMissingFields()).isEmpty();
        assertThat(result.getProgrammingLanguages()).containsExactly("Java", "Python");
        assertThat(result.getRealName()).isEqualTo("陈爱丽");
    }

    /**
     * 边界：未创建档案时返回 null。
     */
    @Test
    void getArchive_profileNotCreated_shouldReturnNull() {
        when(sysUserMapper.selectById(1001L)).thenReturn(student());
        when(studentProfileMapper.selectOne(any())).thenReturn(null);

        StudentArchiveRespVO result = studentArchiveService.getArchive(1001L);

        assertThat(result).isNull();
    }

    /**
     * 边界：个人陈述少于 300 字返回 400001。
     */
    @Test
    void saveArchive_statementTooShort_shouldThrow400001() {
        StudentArchiveSaveReqDTO req = new StudentArchiveSaveReqDTO();
        req.setStatement("太短");
        when(sysUserMapper.selectById(1001L)).thenReturn(student());

        BusinessException exception = catchThrowableOfType(
                () -> studentArchiveService.saveArchive(1001L, req), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400001);
    }

    /**
     * 快乐路径：草稿缺少必填项时保存成功并返回缺失项。
     */
    @Test
    void saveArchive_partialDraft_shouldReturnMissingFields() {
        StudentArchiveSaveReqDTO req = new StudentArchiveSaveReqDTO();
        req.setClassName("软工2201");
        when(sysUserMapper.selectById(1001L)).thenReturn(student());
        when(studentProfileMapper.selectOne(any())).thenReturn(null);
        when(studentProfileMapper.insert(any(StudentProfile.class))).thenAnswer(invocation -> {
            StudentProfile profile = invocation.getArgument(0);
            profile.setId(1L);
            return 1;
        });

        StudentArchiveSaveRespVO result = studentArchiveService.saveArchive(1001L, req);

        assertThat(result.getMissingFields()).containsExactlyInAnyOrder(
                "programmingLanguages", "projectExperience", "weeklyHours", "availableSlots", "statement");
    }

    private SysUser student() {
        SysUser user = new SysUser();
        user.setId(1001L);
        user.setUserNo("20220001");
        user.setRealName("陈爱丽");
        user.setUserType(1);
        user.setCollege("计算机学院");
        user.setMajor("软件工程");
        user.setGrade("2022");
        return user;
    }

    private StudentProfile profile() {
        StudentProfile profile = new StudentProfile();
        profile.setId(1L);
        profile.setUserId(1001L);
        profile.setClassName("软工2201");
        profile.setGpa(new BigDecimal("3.72"));
        profile.setRanking(12);
        profile.setEnglishLevel("CET-6");
        profile.setProgrammingLanguages("Java,Python");
        profile.setTechStack("Spring Boot,Vue 3");
        profile.setProjectExperience("主导过校园二手交易平台后端开发");
        profile.setWeeklyHours(12);
        profile.setAvailableSlots("工作日 19:00-22:00，周末全天");
        profile.setStatement("我".repeat(320));
        return profile;
    }
}
