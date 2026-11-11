package com.college.labselect.service.impl;

import cn.hutool.core.lang.Validator;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.college.labselect.common.PageResult;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.StudentCreateReqDTO;
import com.college.labselect.dto.req.StudentStatusReqDTO;
import com.college.labselect.dto.req.StudentUpdateReqDTO;
import com.college.labselect.dto.resp.StudentImportResultVO;
import com.college.labselect.dto.resp.StudentListVO;
import com.college.labselect.entity.StudentProfile;
import com.college.labselect.entity.SysUser;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.StudentProfileMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.service.IStudentAccountService;
import com.college.labselect.utils.StudentExcelParser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * 学生账号管理服务实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StudentAccountServiceImpl implements IStudentAccountService {

    private static final int USER_TYPE_STUDENT = 1;
    private static final int STATUS_ENABLED = 1;
    private static final int NEED_CHANGE_PWD = 1;

    private final SysUserMapper sysUserMapper;
    private final StudentProfileMapper studentProfileMapper;
    private final StudentExcelParser studentExcelParser;
    private final PasswordEncoder passwordEncoder;

    @Value("${lab-select.default-password:123456}")
    private String defaultPassword = "123456";

    @Override
    public PageResult<StudentListVO> pageStudents(String keyword, Integer status,
                                                  long pageNum, long pageSize) {
        LambdaQueryWrapper<SysUser> wrapper = new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getUserType, USER_TYPE_STUDENT)
                .eq(status != null, SysUser::getStatus, status)
                .orderByAsc(SysUser::getUserNo);
        String text = StrUtil.trim(keyword);
        if (StrUtil.isNotBlank(text)) {
            wrapper.and(query -> query.like(SysUser::getUserNo, text)
                    .or()
                    .like(SysUser::getRealName, text));
        }
        Page<SysUser> page = sysUserMapper.selectPage(new Page<>(pageNum, pageSize), wrapper);
        return PageResult.of(page.convert(this::toListVO));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long createStudent(StudentCreateReqDTO req) {
        String userNo = StrUtil.trim(req.getUserNo());
        if (userNoExists(userNo)) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "学号已存在");
        }
        SysUser user = buildStudent(userNo, req.getRealName(), req.getCollege(), req.getMajor(),
                req.getGrade(), req.getPhone(), req.getEmail());
        user.setStatus(req.getStatus() == null ? STATUS_ENABLED : req.getStatus());
        insertStudent(user);
        log.info("新增学生账号，userId={}", user.getId());
        return user.getId();
    }

    @Override
    public void updateStudent(Long id, StudentUpdateReqDTO req) {
        SysUser user = requireStudent(id);
        user.setRealName(req.getRealName());
        user.setCollege(req.getCollege());
        user.setMajor(req.getMajor());
        user.setGrade(req.getGrade());
        user.setPhone(req.getPhone());
        user.setEmail(req.getEmail());
        if (req.getStatus() != null) {
            user.setStatus(req.getStatus());
        }
        sysUserMapper.updateById(user);
        log.info("编辑学生账号，userId={}", id);
    }

    @Override
    public void updateStatus(Long id, StudentStatusReqDTO req) {
        SysUser user = requireStudent(id);
        user.setStatus(req.getStatus());
        sysUserMapper.updateById(user);
        log.info("更新学生账号状态，userId={}，status={}", id, req.getStatus());
    }

    @Override
    public void resetPassword(Long id) {
        SysUser user = requireStudent(id);
        user.setPassword(passwordEncoder.encode(defaultPassword));
        user.setNeedChangePwd(NEED_CHANGE_PWD);
        sysUserMapper.updateById(user);
        log.info("重置学生密码，userId={}", id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public StudentImportResultVO importStudents(MultipartFile file) {
        List<StudentExcelParser.Row> rows = studentExcelParser.parse(file);
        List<StudentImportResultVO.FailItem> failList = new ArrayList<>();
        int successCount = 0;
        for (StudentExcelParser.Row row : rows) {
            String reason = validateRow(row);
            if (reason == null && userNoExists(row.getUserNo())) {
                reason = "学号已存在";
            }
            if (reason != null) {
                failList.add(failItem(row, reason));
                continue;
            }
            try {
                SysUser user = buildStudent(row.getUserNo(), row.getRealName(), row.getCollege(),
                        row.getMajor(), row.getGrade(), row.getPhone(), row.getEmail());
                user.setStatus(STATUS_ENABLED);
                insertStudent(user);
                successCount++;
            } catch (RuntimeException e) {
                log.warn("导入学生失败，row={}，userNo={}", row.getRowNo(), row.getUserNo(), e);
                failList.add(failItem(row, "导入失败"));
            }
        }
        StudentImportResultVO result = new StudentImportResultVO();
        result.setSuccessCount(successCount);
        result.setFailCount(failList.size());
        result.setFailList(failList);
        result.setFailFileUrl(null);
        log.info("批量导入学生完成，成功={}，失败={}", successCount, failList.size());
        return result;
    }

    /**
     * 校验导入行必填与格式。
     *
     * @param row 导入行
     * @return 失败原因，校验通过返回 null
     */
    private String validateRow(StudentExcelParser.Row row) {
        if (StrUtil.isBlank(row.getUserNo())) {
            return "学号不能为空";
        }
        if (StrUtil.isBlank(row.getRealName())) {
            return "姓名不能为空";
        }
        if (StrUtil.isNotBlank(row.getPhone()) && !Validator.isMobile(row.getPhone())) {
            return "手机号格式错误";
        }
        if (StrUtil.isNotBlank(row.getEmail()) && !Validator.isEmail(row.getEmail())) {
            return "邮箱格式错误";
        }
        return null;
    }

    /**
     * 判断学号是否已存在。
     *
     * @param userNo 学号
     * @return 是否存在
     */
    private boolean userNoExists(String userNo) {
        return sysUserMapper.selectCount(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getUserNo, userNo)) > 0;
    }

    /**
     * 构建学生账号实体。
     *
     * @param userNo   学号
     * @param realName 姓名
     * @param college  学院
     * @param major    专业
     * @param grade    年级
     * @param phone    手机号
     * @param email    邮箱
     * @return 学生账号实体
     */
    private SysUser buildStudent(String userNo, String realName, String college, String major,
                                 String grade, String phone, String email) {
        SysUser user = new SysUser();
        user.setUserNo(StrUtil.trim(userNo));
        user.setPassword(passwordEncoder.encode(defaultPassword));
        user.setRealName(realName);
        user.setUserType(USER_TYPE_STUDENT);
        user.setCollege(college);
        user.setMajor(major);
        user.setGrade(grade);
        user.setPhone(phone);
        user.setEmail(email);
        user.setNeedChangePwd(NEED_CHANGE_PWD);
        return user;
    }

    /**
     * 写入学生账号与空学生档案。
     *
     * @param user 学生账号实体
     */
    private void insertStudent(SysUser user) {
        sysUserMapper.insert(user);
        StudentProfile profile = new StudentProfile();
        profile.setUserId(user.getId());
        studentProfileMapper.insert(profile);
    }

    /**
     * 查询并校验学生账号存在。
     *
     * @param id 学生用户 ID
     * @return 学生账号
     */
    private SysUser requireStudent(Long id) {
        SysUser user = sysUserMapper.selectById(id);
        if (user == null || !Objects.equals(user.getUserType(), USER_TYPE_STUDENT)) {
            throw new BusinessException(ResultCode.NOT_FOUND, "学生账号不存在");
        }
        return user;
    }

    /**
     * 构建导入失败明细。
     *
     * @param row    导入行
     * @param reason 失败原因
     * @return 失败明细
     */
    private StudentImportResultVO.FailItem failItem(StudentExcelParser.Row row, String reason) {
        StudentImportResultVO.FailItem item = new StudentImportResultVO.FailItem();
        item.setRow(row.getRowNo());
        item.setUserNo(row.getUserNo());
        item.setReason(reason);
        return item;
    }

    /**
     * 实体转列表项。
     *
     * @param user 学生账号
     * @return 列表项
     */
    private StudentListVO toListVO(SysUser user) {
        StudentListVO vo = new StudentListVO();
        vo.setId(user.getId());
        vo.setUserId(user.getId());
        vo.setUserNo(user.getUserNo());
        vo.setRealName(user.getRealName());
        vo.setCollege(user.getCollege());
        vo.setMajor(user.getMajor());
        vo.setGrade(user.getGrade());
        vo.setPhone(user.getPhone());
        vo.setEmail(user.getEmail());
        vo.setStatus(user.getStatus());
        vo.setNeedChangePwd(user.getNeedChangePwd());
        return vo;
    }
}
