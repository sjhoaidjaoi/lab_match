package com.college.labselect.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.ChangePasswordReqDTO;
import com.college.labselect.dto.req.LoginReqDTO;
import com.college.labselect.dto.resp.LoginRespVO;
import com.college.labselect.dto.resp.TokenRespVO;
import com.college.labselect.dto.resp.UserInfoVO;
import com.college.labselect.entity.Lab;
import com.college.labselect.entity.SysUser;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.LabMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.security.JwtUtils;
import com.college.labselect.security.LoginUser;
import com.college.labselect.service.IAuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Date;
import java.util.Objects;

/**
 * 认证服务实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements IAuthService {

    private static final int STATUS_ENABLED = 1;
    private static final int USER_TYPE_TEACHER = 2;
    private static final int NEED_CHANGE_PASSWORD = 1;
    private static final int PASSWORD_CHANGED = 0;
    private static final String BEARER_PREFIX = "Bearer ";
    private static final String BLACKLIST_KEY_PREFIX = "auth:blacklist:";

    private final SysUserMapper sysUserMapper;
    private final LabMapper labMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final StringRedisTemplate stringRedisTemplate;

    @Override
    public LoginRespVO login(LoginReqDTO req) {
        String userNo = StrUtil.trim(req.getUserNo());
        SysUser user = sysUserMapper.selectOne(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getUserNo, userNo));
        if (user == null || !Objects.equals(user.getUserType(), req.getLoginType())) {
            throw new BusinessException(ResultCode.LOGIN_FAILED);
        }
        if (!Objects.equals(user.getStatus(), STATUS_ENABLED)) {
            throw new BusinessException(ResultCode.ACCOUNT_DISABLED);
        }
        if (!passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            throw new BusinessException(ResultCode.LOGIN_FAILED);
        }
        LoginUser loginUser = new LoginUser(user.getId(), user.getUserNo(), user.getUserType());
        LoginRespVO resp = new LoginRespVO();
        resp.setToken(jwtUtils.generateToken(loginUser));
        resp.setExpiresIn(jwtUtils.getExpireSeconds());
        resp.setNeedChangePwd(user.getNeedChangePwd());
        resp.setUser(toUserInfo(user));
        log.info("用户登录成功，userId={}，userType={}", user.getId(), user.getUserType());
        return resp;
    }

    @Override
    public void logout(String authorization) {
        String token = extractToken(authorization);
        String jti = jwtUtils.getJti(token);
        Date expiration = jwtUtils.getExpiration(token);
        long ttlSeconds = Math.max((expiration.getTime() - System.currentTimeMillis()) / 1000, 1L);
        stringRedisTemplate.opsForValue()
                .set(BLACKLIST_KEY_PREFIX + jti, "1", Duration.ofSeconds(ttlSeconds));
        log.info("用户登出并加入黑名单，jti={}", jti);
    }

    @Override
    public TokenRespVO refresh(String authorization) {
        String token = extractToken(authorization);
        LoginUser loginUser;
        try {
            loginUser = jwtUtils.getLoginUser(token);
        } catch (Exception e) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        String newToken = jwtUtils.generateToken(loginUser);
        log.info("刷新 Token，userId={}", loginUser.getUserId());
        return new TokenRespVO(newToken, jwtUtils.getExpireSeconds());
    }

    @Override
    public void changePassword(Long userId, ChangePasswordReqDTO req) {
        if (!req.getNewPassword().equals(req.getConfirmPassword())) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "两次输入的密码不一致");
        }
        if (req.getNewPassword().equals(req.getOldPassword())) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "新密码不能与原密码相同");
        }
        SysUser user = sysUserMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        if (!passwordEncoder.matches(req.getOldPassword(), user.getPassword())) {
            throw new BusinessException(ResultCode.LOGIN_FAILED);
        }
        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        user.setNeedChangePwd(PASSWORD_CHANGED);
        sysUserMapper.updateById(user);
        log.info("用户修改密码，userId={}", userId);
    }

    /**
     * 提取 Bearer Token。
     *
     * @param authorization Authorization 请求头
     * @return Token 字符串
     */
    private String extractToken(String authorization) {
        if (StrUtil.isBlank(authorization) || !authorization.startsWith(BEARER_PREFIX)) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        String token = authorization.substring(BEARER_PREFIX.length()).trim();
        if (StrUtil.isBlank(token)) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return token;
    }

    /**
     * 实体转登录用户信息。
     *
     * @param user 用户实体
     * @return 用户信息
     */
    private UserInfoVO toUserInfo(SysUser user) {
        UserInfoVO userInfo = new UserInfoVO();
        userInfo.setId(user.getId());
        userInfo.setUserNo(user.getUserNo());
        userInfo.setRealName(user.getRealName());
        userInfo.setUserType(user.getUserType());
        userInfo.setLeader(Integer.valueOf(USER_TYPE_TEACHER).equals(user.getUserType())
                && labMapper.selectOne(new LambdaQueryWrapper<Lab>()
                .eq(Lab::getLeaderId, user.getId())) != null);
        userInfo.setCollege(user.getCollege());
        userInfo.setMajor(user.getMajor());
        userInfo.setGrade(user.getGrade());
        return userInfo;
    }
}
