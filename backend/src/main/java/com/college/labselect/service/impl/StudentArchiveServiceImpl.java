package com.college.labselect.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.StudentArchiveSaveReqDTO;
import com.college.labselect.dto.resp.StudentArchiveRespVO;
import com.college.labselect.dto.resp.StudentArchiveSaveRespVO;
import com.college.labselect.entity.StudentProfile;
import com.college.labselect.entity.SysUser;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.StudentProfileMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.service.IStudentArchiveService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * 学生档案服务实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StudentArchiveServiceImpl implements IStudentArchiveService {

    private static final int STATEMENT_MIN_LENGTH = 300;
    private static final int STATEMENT_MAX_LENGTH = 800;
    private static final int WEEKLY_HOURS_MIN = 1;
    private static final int WEEKLY_HOURS_MAX = 40;

    private final StudentProfileMapper studentProfileMapper;
    private final SysUserMapper sysUserMapper;

    @Override
    public StudentArchiveRespVO getArchive(Long studentUserId) {
        SysUser user = requireStudent(studentUserId);
        StudentProfile profile = studentProfileMapper.selectOne(new LambdaQueryWrapper<StudentProfile>()
                .eq(StudentProfile::getUserId, studentUserId));
        if (profile == null) {
            return null;
        }
        StudentArchiveRespVO vo = new StudentArchiveRespVO();
        vo.setUserNo(user.getUserNo());
        vo.setRealName(user.getRealName());
        vo.setCollege(user.getCollege());
        vo.setMajor(user.getMajor());
        vo.setGrade(user.getGrade());
        vo.setClassName(profile.getClassName());
        vo.setGpa(profile.getGpa());
        vo.setRanking(profile.getRanking());
        vo.setEnglishLevel(profile.getEnglishLevel());
        vo.setProgrammingLanguages(splitToList(profile.getProgrammingLanguages()));
        vo.setTechStack(splitToList(profile.getTechStack()));
        vo.setProjectExperience(profile.getProjectExperience());
        vo.setCompetitionExperience(profile.getCompetitionExperience());
        vo.setResearchExperience(profile.getResearchExperience());
        vo.setInternshipExperience(profile.getInternshipExperience());
        vo.setWeeklyHours(profile.getWeeklyHours());
        vo.setAvailableSlots(profile.getAvailableSlots());
        vo.setOtherDuties(profile.getOtherDuties());
        vo.setExpectedDirection(profile.getExpectedDirection());
        vo.setStatement(profile.getStatement());
        vo.setMissingFields(missingFields(profile));
        return vo;
    }

    @Override
    public StudentArchiveSaveRespVO saveArchive(Long studentUserId, StudentArchiveSaveReqDTO req) {
        requireStudent(studentUserId);
        validateStatement(req.getStatement());
        validateWeeklyHours(req.getWeeklyHours());
        StudentProfile profile = studentProfileMapper.selectOne(new LambdaQueryWrapper<StudentProfile>()
                .eq(StudentProfile::getUserId, studentUserId));
        boolean created = profile == null;
        if (created) {
            profile = new StudentProfile();
            profile.setUserId(studentUserId);
        }
        applyRequest(profile, req);
        if (created) {
            studentProfileMapper.insert(profile);
        } else {
            studentProfileMapper.updateById(profile);
        }
        List<String> missing = missingFields(profile);
        log.info("保存学生档案，studentUserId={}，新增={}，缺失项数={}",
                studentUserId, created, missing.size());
        return new StudentArchiveSaveRespVO(missing);
    }

    /**
     * 校验个人陈述长度，草稿允许为空。
     *
     * @param statement 个人陈述
     */
    private void validateStatement(String statement) {
        if (StrUtil.isBlank(statement)) {
            return;
        }
        if (statement.length() < STATEMENT_MIN_LENGTH || statement.length() > STATEMENT_MAX_LENGTH) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "个人陈述需为 300-800 字");
        }
    }

    /**
     * 校验每周可投入小时。
     *
     * @param weeklyHours 每周可投入小时
     */
    private void validateWeeklyHours(Integer weeklyHours) {
        if (weeklyHours != null
                && (weeklyHours < WEEKLY_HOURS_MIN || weeklyHours > WEEKLY_HOURS_MAX)) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "每周可投入小时需在 1-40 之间");
        }
    }

    /**
     * 将请求字段写入档案实体。
     *
     * @param profile 档案实体
     * @param req     保存请求
     */
    private void applyRequest(StudentProfile profile, StudentArchiveSaveReqDTO req) {
        profile.setClassName(StrUtil.trim(req.getClassName()));
        profile.setGpa(req.getGpa());
        profile.setRanking(req.getRanking());
        profile.setEnglishLevel(StrUtil.trim(req.getEnglishLevel()));
        profile.setProgrammingLanguages(joinList(req.getProgrammingLanguages()));
        profile.setTechStack(joinList(req.getTechStack()));
        profile.setProjectExperience(StrUtil.trim(req.getProjectExperience()));
        profile.setCompetitionExperience(StrUtil.trim(req.getCompetitionExperience()));
        profile.setResearchExperience(StrUtil.trim(req.getResearchExperience()));
        profile.setInternshipExperience(StrUtil.trim(req.getInternshipExperience()));
        profile.setWeeklyHours(req.getWeeklyHours());
        profile.setAvailableSlots(StrUtil.trim(req.getAvailableSlots()));
        profile.setOtherDuties(StrUtil.trim(req.getOtherDuties()));
        profile.setExpectedDirection(StrUtil.trim(req.getExpectedDirection()));
        profile.setStatement(StrUtil.trim(req.getStatement()));
    }

    /**
     * 计算缺失的必填项 key。
     *
     * @param profile 档案实体
     * @return 缺失项 key 列表
     */
    private List<String> missingFields(StudentProfile profile) {
        List<String> missing = new ArrayList<>();
        if (StrUtil.isBlank(profile.getProgrammingLanguages())) {
            missing.add("programmingLanguages");
        }
        if (StrUtil.isBlank(profile.getProjectExperience())) {
            missing.add("projectExperience");
        }
        if (profile.getWeeklyHours() == null
                || profile.getWeeklyHours() < WEEKLY_HOURS_MIN
                || profile.getWeeklyHours() > WEEKLY_HOURS_MAX) {
            missing.add("weeklyHours");
        }
        if (StrUtil.isBlank(profile.getAvailableSlots())) {
            missing.add("availableSlots");
        }
        String statement = profile.getStatement();
        if (StrUtil.isBlank(statement) || statement.length() < STATEMENT_MIN_LENGTH
                || statement.length() > STATEMENT_MAX_LENGTH) {
            missing.add("statement");
        }
        return missing;
    }

    /**
     * 逗号分隔字符串转列表。
     *
     * @param value 逗号分隔字符串
     * @return 列表
     */
    private List<String> splitToList(String value) {
        return StrUtil.isBlank(value) ? List.of() : StrUtil.split(value, ',');
    }

    /**
     * 列表转逗号分隔字符串。
     *
     * @param values 列表
     * @return 逗号分隔字符串
     */
    private String joinList(List<String> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        List<String> cleaned = values.stream()
                .filter(StrUtil::isNotBlank)
                .map(StrUtil::trim)
                .distinct()
                .toList();
        return cleaned.isEmpty() ? null : String.join(",", cleaned);
    }

    /**
     * 查询学生账号。
     *
     * @param studentUserId 学生用户 ID
     * @return 学生账号
     */
    private SysUser requireStudent(Long studentUserId) {
        SysUser user = sysUserMapper.selectById(studentUserId);
        if (user == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "学生不存在");
        }
        return user;
    }
}
