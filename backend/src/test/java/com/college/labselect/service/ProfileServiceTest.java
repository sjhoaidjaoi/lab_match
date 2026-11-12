package com.college.labselect.service;

import com.college.labselect.dto.req.ProfileUpdateReqDTO;
import com.college.labselect.dto.resp.ProfileRespVO;
import com.college.labselect.entity.SysUser;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.service.impl.ProfileServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 个人中心服务单元测试。
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ProfileServiceTest {

    @Mock
    private SysUserMapper sysUserMapper;

    @InjectMocks
    private ProfileServiceImpl profileService;

    /**
     * 快乐路径：学生个人信息返回学号、学院与联系方式。
     */
    @Test
    void getStudentProfile_shouldReturnUserInfo() {
        when(sysUserMapper.selectById(1001L)).thenReturn(student());

        ProfileRespVO result = profileService.getStudentProfile(1001L);

        assertThat(result.getUserNo()).isEqualTo("20220001");
        assertThat(result.getRealName()).isEqualTo("陈爱丽");
        assertThat(result.getCollege()).isEqualTo("计算机学院");
        assertThat(result.getPhone()).isEqualTo("13800005678");
    }

    /**
     * 边界：用户不存在返回 404001。
     */
    @Test
    void getStudentProfile_missing_shouldThrow404001() {
        when(sysUserMapper.selectById(1001L)).thenReturn(null);

        BusinessException exception = catchThrowableOfType(
                () -> profileService.getStudentProfile(1001L), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(404001);
    }

    /**
     * 快乐路径：修改手机号与邮箱并去除首尾空格。
     */
    @Test
    void updateStudentProfile_shouldUpdatePhoneAndEmail() {
        when(sysUserMapper.selectById(1001L)).thenReturn(student());
        ProfileUpdateReqDTO req = new ProfileUpdateReqDTO();
        req.setPhone(" 13900001111 ");
        req.setEmail(" new@college.edu.cn ");

        profileService.updateStudentProfile(1001L, req);

        ArgumentCaptor<SysUser> captor = ArgumentCaptor.forClass(SysUser.class);
        verify(sysUserMapper).updateById(captor.capture());
        assertThat(captor.getValue().getPhone()).isEqualTo("13900001111");
        assertThat(captor.getValue().getEmail()).isEqualTo("new@college.edu.cn");
    }

    /**
     * 快乐路径：空白联系方式保存时清空。
     */
    @Test
    void updateStudentProfile_blankValues_shouldClearContact() {
        when(sysUserMapper.selectById(1001L)).thenReturn(student());
        ProfileUpdateReqDTO req = new ProfileUpdateReqDTO();
        req.setPhone(" ");
        req.setEmail("");

        profileService.updateStudentProfile(1001L, req);

        ArgumentCaptor<SysUser> captor = ArgumentCaptor.forClass(SysUser.class);
        verify(sysUserMapper).updateById(captor.capture());
        assertThat(captor.getValue().getPhone()).isNull();
        assertThat(captor.getValue().getEmail()).isNull();
    }

    /**
     * 边界：学生访问教师个人中心返回 403001。
     */
    @Test
    void getTeacherProfile_withStudentAccount_shouldThrow403001() {
        when(sysUserMapper.selectById(1001L)).thenReturn(student());

        BusinessException exception = catchThrowableOfType(
                () -> profileService.getTeacherProfile(1001L), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(403001);
    }

    private SysUser student() {
        SysUser user = new SysUser();
        user.setId(1001L);
        user.setUserNo("20220001");
        user.setRealName("陈爱丽");
        user.setUserType(1);
        user.setPhone("13800005678");
        user.setEmail("chen@college.edu.cn");
        user.setCollege("计算机学院");
        user.setMajor("软件工程");
        user.setGrade("2022");
        return user;
    }
}
