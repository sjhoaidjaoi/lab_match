package com.college.labselect.service.impl;

import cn.hutool.core.util.StrUtil;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.ProfileUpdateReqDTO;
import com.college.labselect.dto.resp.ProfileRespVO;
import com.college.labselect.entity.SysUser;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.service.IProfileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * 个人中心服务实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProfileServiceImpl implements IProfileService {

    private static final int USER_STUDENT = 1;
    private static final int USER_TEACHER = 2;

    private final SysUserMapper sysUserMapper;

    @Override
    public ProfileRespVO getStudentProfile(Long userId) {
        return toVO(requireUser(userId, USER_STUDENT));
    }

    @Override
    public void updateStudentProfile(Long userId, ProfileUpdateReqDTO req) {
        update(requireUser(userId, USER_STUDENT), req);
    }

    @Override
    public ProfileRespVO getTeacherProfile(Long userId) {
        return toVO(requireUser(userId, USER_TEACHER));
    }

    @Override
    public void updateTeacherProfile(Long userId, ProfileUpdateReqDTO req) {
        update(requireUser(userId, USER_TEACHER), req);
    }

    /**
     * 更新手机号与邮箱，空白值清空。
     *
     * @param user 用户账号
     * @param req  修改请求
     */
    private void update(SysUser user, ProfileUpdateReqDTO req) {
        user.setPhone(StrUtil.blankToDefault(StrUtil.trim(req.getPhone()), null));
        user.setEmail(StrUtil.blankToDefault(StrUtil.trim(req.getEmail()), null));
        sysUserMapper.updateById(user);
        log.info("修改个人信息，userId={}", user.getId());
    }

    /**
     * 查询指定角色用户。
     *
     * @param userId   用户 ID
     * @param userType 期望用户类型
     * @return 用户账号
     */
    private SysUser requireUser(Long userId, int userType) {
        SysUser user = sysUserMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "用户不存在");
        }
        if (!Integer.valueOf(userType).equals(user.getUserType())) {
            throw new BusinessException(ResultCode.FORBIDDEN, "无权访问该资源");
        }
        return user;
    }

    /**
     * 转个人信息 VO。
     *
     * @param user 用户账号
     * @return 个人信息
     */
    private ProfileRespVO toVO(SysUser user) {
        ProfileRespVO vo = new ProfileRespVO();
        vo.setId(user.getId());
        vo.setUserNo(user.getUserNo());
        vo.setRealName(user.getRealName());
        vo.setUserType(user.getUserType());
        vo.setGender(user.getGender());
        vo.setPhone(user.getPhone());
        vo.setEmail(user.getEmail());
        vo.setCollege(user.getCollege());
        vo.setMajor(user.getMajor());
        vo.setGrade(user.getGrade());
        vo.setTitle(user.getTitle());
        return vo;
    }
}
