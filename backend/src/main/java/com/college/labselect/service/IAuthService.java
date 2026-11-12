package com.college.labselect.service;

import com.college.labselect.dto.req.ChangePasswordReqDTO;
import com.college.labselect.dto.req.LoginReqDTO;
import com.college.labselect.dto.resp.LoginRespVO;
import com.college.labselect.dto.resp.TokenRespVO;

/**
 * 认证服务。
 */
public interface IAuthService {

    /**
     * 统一登录。
     *
     * @param req 登录请求
     * @return 登录响应
     */
    LoginRespVO login(LoginReqDTO req);

    /**
     * 登出并将 Token 写入黑名单。
     *
     * @param authorization Authorization 请求头
     */
    void logout(String authorization);

    /**
     * 刷新 Token。
     *
     * @param authorization Authorization 请求头
     * @return 新 Token
     */
    TokenRespVO refresh(String authorization);

    /**
     * 修改密码。
     *
     * @param userId 当前用户 ID
     * @param req    修改密码请求
     */
    void changePassword(Long userId, ChangePasswordReqDTO req);
}
