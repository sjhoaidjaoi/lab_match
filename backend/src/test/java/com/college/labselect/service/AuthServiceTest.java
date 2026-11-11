package com.college.labselect.service;

import com.college.labselect.dto.req.ChangePasswordReqDTO;
import com.college.labselect.dto.req.LoginReqDTO;
import com.college.labselect.dto.resp.LoginRespVO;
import com.college.labselect.entity.Lab;
import com.college.labselect.entity.SysUser;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.LabMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.security.JwtUtils;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.impl.AuthServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 认证服务单元测试，阶段 3 以红灯作为阶段 4 的编码边界。
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private SysUserMapper sysUserMapper;

    @Mock
    private LabMapper labMapper;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtils jwtUtils;

    @InjectMocks
    private AuthServiceImpl authService;

    /**
     * 快乐路径：学号密码正确，返回 Token 与用户信息。
     */
    @Test
    void login_success_shouldReturnTokenAndUserInfo() {
        LoginReqDTO req = loginReq("20220001", "123456");
        SysUser user = user(1001L, "20220001", 1, 1, 0);
        user.setPassword("$2a$10$mockedHash");
        when(sysUserMapper.selectOne(any())).thenReturn(user);
        when(passwordEncoder.matches("123456", user.getPassword())).thenReturn(true);
        when(jwtUtils.generateToken(any(LoginUser.class))).thenReturn("jwt-token");
        when(jwtUtils.getExpireSeconds()).thenReturn(7200L);

        LoginRespVO resp = authService.login(req);

        assertThat(resp.getToken()).isEqualTo("jwt-token");
        assertThat(resp.getExpiresIn()).isEqualTo(7200L);
        assertThat(resp.getNeedChangePwd()).isZero();
        assertThat(resp.getUser().getRealName()).isEqualTo("陈爱丽");
        assertThat(resp.getUser().getLeader()).isFalse();
        verify(sysUserMapper, times(1)).selectOne(any());
    }

    /**
     * 快乐路径：作为负责人的教师登录时返回 leader = true。
     */
    @Test
    void login_teacherLeader_shouldMarkLeader() {
        LoginReqDTO req = loginReq("20010001", "123456");
        req.setLoginType(2);
        SysUser user = user(2001L, "20010001", 2, 1, 0);
        user.setPassword("$2a$10$mockedHash");
        when(sysUserMapper.selectOne(any())).thenReturn(user);
        when(passwordEncoder.matches("123456", user.getPassword())).thenReturn(true);
        when(jwtUtils.generateToken(any(LoginUser.class))).thenReturn("jwt-token");
        when(jwtUtils.getExpireSeconds()).thenReturn(7200L);
        when(labMapper.selectOne(any())).thenReturn(new Lab());

        LoginRespVO resp = authService.login(req);

        assertThat(resp.getUser().getLeader()).isTrue();
    }

    /**
     * 边界：密码错误返回 401002。
     */
    @Test
    void login_wrongPassword_shouldThrow401002() {
        LoginReqDTO req = loginReq("20220001", "wrong-password");
        SysUser user = user(1001L, "20220001", 1, 1, 0);
        user.setPassword("$2a$10$mockedHash");
        when(sysUserMapper.selectOne(any())).thenReturn(user);
        when(passwordEncoder.matches("wrong-password", user.getPassword())).thenReturn(false);

        BusinessException exception = catchThrowableOfType(() -> authService.login(req), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(401002);
    }

    /**
     * 边界：账号被禁用返回 401003。
     */
    @Test
    void login_disabledAccount_shouldThrow401003() {
        LoginReqDTO req = loginReq("20220002", "123456");
        SysUser user = user(1002L, "20220002", 1, 0, 0);
        user.setPassword("$2a$10$mockedHash");
        when(sysUserMapper.selectOne(any())).thenReturn(user);

        BusinessException exception = catchThrowableOfType(() -> authService.login(req), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(401003);
    }

    /**
     * 边界：账号不存在同样返回 401002，避免暴露账号是否存在。
     */
    @Test
    void login_userNotFound_shouldThrow401002() {
        LoginReqDTO req = loginReq("20999999", "123456");
        when(sysUserMapper.selectOne(any())).thenReturn(null);

        BusinessException exception = catchThrowableOfType(() -> authService.login(req), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(401002);
    }

    /**
     * 边界：两次输入的新密码不一致返回 400001。
     */
    @Test
    void changePassword_confirmMismatch_shouldThrow400001() {
        ChangePasswordReqDTO req = changePasswordReq("abc12345", "newPass123", "newPass124");

        BusinessException exception = catchThrowableOfType(
                () -> authService.changePassword(1001L, req), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400001);
    }

    /**
     * 边界：新密码不能与原密码相同，返回 400002。
     */
    @Test
    void changePassword_sameAsOld_shouldThrow400002() {
        ChangePasswordReqDTO req = changePasswordReq("abc12345", "abc12345", "abc12345");

        BusinessException exception = catchThrowableOfType(
                () -> authService.changePassword(1001L, req), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400002);
    }

    /**
     * 快乐路径：原密码正确、新密码合规，更新密码并清除改密标记。
     */
    @Test
    void changePassword_success_shouldUpdatePassword() {
        SysUser user = user(1001L, "20220001", 1, 1, 0);
        user.setPassword("$2a$10$oldHash");
        when(sysUserMapper.selectById(1001L)).thenReturn(user);
        when(passwordEncoder.matches("abc12345", user.getPassword())).thenReturn(true);
        when(passwordEncoder.encode("newPass123")).thenReturn("$2a$10$newHash");
        when(sysUserMapper.updateById(any(SysUser.class))).thenReturn(1);
        ChangePasswordReqDTO req = changePasswordReq("abc12345", "newPass123", "newPass123");

        authService.changePassword(1001L, req);

        assertThat(user.getPassword()).isEqualTo("$2a$10$newHash");
        assertThat(user.getNeedChangePwd()).isZero();
        verify(sysUserMapper, times(1)).updateById(user);
    }

    private LoginReqDTO loginReq(String userNo, String password) {
        LoginReqDTO req = new LoginReqDTO();
        req.setLoginType(1);
        req.setUserNo(userNo);
        req.setPassword(password);
        return req;
    }

    private ChangePasswordReqDTO changePasswordReq(String oldPassword, String newPassword, String confirmPassword) {
        ChangePasswordReqDTO req = new ChangePasswordReqDTO();
        req.setOldPassword(oldPassword);
        req.setNewPassword(newPassword);
        req.setConfirmPassword(confirmPassword);
        return req;
    }

    private SysUser user(Long id, String userNo, int userType, int status, int needChangePwd) {
        SysUser user = new SysUser();
        user.setId(id);
        user.setUserNo(userNo);
        user.setRealName("陈爱丽");
        user.setUserType(userType);
        user.setStatus(status);
        user.setNeedChangePwd(needChangePwd);
        return user;
    }
}
