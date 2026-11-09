package com.labmatch.module.auth.service;

import com.labmatch.common.BusinessException;
import com.labmatch.common.ResultCode;
import com.labmatch.module.auth.dto.ChangePasswordRequest;
import com.labmatch.module.auth.dto.LoginRequest;
import com.labmatch.module.auth.dto.LoginResponse;
import com.labmatch.module.auth.dto.MeResponse;
import com.labmatch.module.auth.dto.RoleView;
import com.labmatch.module.auth.dto.UserView;
import com.labmatch.module.auth.entity.UserAccount;
import com.labmatch.module.auth.entity.UserRole;
import com.labmatch.module.auth.mapper.UserAccountMapper;
import com.labmatch.module.auth.mapper.UserRoleMapper;
import com.labmatch.security.JwtUtil;
import com.labmatch.security.LoginUser;
import com.labmatch.security.UserContext;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Map<String, String> ROLE_NAMES = Map.of(
            "STUDENT", "学生",
            "MENTOR", "导师",
            "LAB_HEAD", "实训室负责人",
            "COLLEGE_ADMIN", "学院管理员",
            "SYS_ADMIN", "系统管理员"
    );

    private final UserAccountMapper userAccountMapper;
    private final UserRoleMapper userRoleMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public LoginResponse login(LoginRequest request) {
        UserAccount account = userAccountMapper.selectOne(new LambdaQueryWrapper<UserAccount>()
                .eq(UserAccount::getLoginName, request.getLoginName())
                .last("LIMIT 1"));
        if (account == null || !passwordEncoder.matches(request.getPassword(), account.getPasswordHash())) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "学号/工号或密码错误", HttpStatus.UNAUTHORIZED);
        }
        if (!"ENABLED".equals(account.getStatus())) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "账号已被禁用，请联系学院管理员", HttpStatus.UNAUTHORIZED);
        }
        List<UserRole> roles = userRoleMapper.selectActiveByUserId(account.getId());
        if (roles.isEmpty()) {
            throw new BusinessException(ResultCode.ROLE_FORBIDDEN, "账号未分配角色，请联系学院管理员", HttpStatus.FORBIDDEN);
        }

        account.setLastLoginAt(LocalDateTime.now());
        userAccountMapper.updateById(account);

        LoginResponse response = new LoginResponse();
        response.setToken(jwtUtil.generate(account.getId(), roles.get(0).getRoleCode()));
        response.setUser(toUserView(account));
        response.setRoles(roles.stream().map(this::toRoleView).toList());
        response.setActiveRole(roles.get(0).getRoleCode());
        return response;
    }

    public MeResponse me() {
        LoginUser current = UserContext.require();
        UserAccount account = userAccountMapper.selectById(current.getUserId());
        if (account == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "账号不存在", HttpStatus.UNAUTHORIZED);
        }
        List<UserRole> roles = userRoleMapper.selectActiveByUserId(account.getId());

        MeResponse response = new MeResponse();
        response.setUser(toUserView(account));
        response.setRoles(roles.stream().map(this::toRoleView).toList());
        response.setActiveRole(current.getRoleCode());
        return response;
    }

    public LoginResponse switchRole(String roleCode) {
        LoginUser current = UserContext.require();
        UserRole target = userRoleMapper.selectActiveByUserId(current.getUserId()).stream()
                .filter(r -> r.getRoleCode().equals(roleCode))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ResultCode.ROLE_FORBIDDEN, "账号不具备该角色", HttpStatus.FORBIDDEN));

        UserAccount account = userAccountMapper.selectById(current.getUserId());
        LoginResponse response = new LoginResponse();
        response.setToken(jwtUtil.generate(account.getId(), target.getRoleCode()));
        response.setUser(toUserView(account));
        response.setRoles(userRoleMapper.selectActiveByUserId(account.getId()).stream().map(this::toRoleView).toList());
        response.setActiveRole(target.getRoleCode());
        return response;
    }

    public void changePassword(ChangePasswordRequest request) {
        UserAccount account = userAccountMapper.selectById(UserContext.userId());
        if (!passwordEncoder.matches(request.getOldPassword(), account.getPasswordHash())) {
            throw new BusinessException(ResultCode.VALIDATION_FAILED, "原密码不正确");
        }
        account.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        account.setMustChangePassword(false);
        userAccountMapper.updateById(account);
    }

    private UserView toUserView(UserAccount account) {
        UserView view = new UserView();
        view.setId(account.getId());
        view.setLoginName(account.getLoginName());
        view.setName(account.getName());
        view.setStudentNo(account.getStudentNo());
        view.setEmployeeNo(account.getEmployeeNo());
        view.setPhone(account.getPhone());
        view.setEmail(account.getEmail());
        view.setMustChangePassword(account.getMustChangePassword());
        return view;
    }

    private RoleView toRoleView(UserRole role) {
        RoleView view = new RoleView();
        view.setRoleCode(role.getRoleCode());
        view.setRoleName(ROLE_NAMES.getOrDefault(role.getRoleCode(), role.getRoleCode()));
        view.setScopeType(role.getScopeType());
        view.setScopeId(role.getScopeId());
        return view;
    }
}
