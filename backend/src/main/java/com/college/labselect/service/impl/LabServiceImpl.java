package com.college.labselect.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.college.labselect.common.PageResult;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.LabSaveReqDTO;
import com.college.labselect.dto.req.LeaderAssignReqDTO;
import com.college.labselect.dto.resp.LabDetailVO;
import com.college.labselect.dto.resp.LabListVO;
import com.college.labselect.dto.resp.LabMentorVO;
import com.college.labselect.entity.Lab;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.OperationLog;
import com.college.labselect.entity.SysUser;
import com.college.labselect.entity.UserNotice;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.LabMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.OperationLogMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.mapper.UserNoticeMapper;
import com.college.labselect.service.ILabService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 实训室服务实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LabServiceImpl implements ILabService {

    private static final int STATUS_OPEN = 1;
    private static final int USER_TYPE_TEACHER = 2;
    private static final int USER_ENABLED = 1;
    private static final int NOTICE_TYPE_SYSTEM = 1;

    private final LabMapper labMapper;
    private final MentorProfileMapper mentorProfileMapper;
    private final SysUserMapper sysUserMapper;
    private final OperationLogMapper operationLogMapper;
    private final UserNoticeMapper userNoticeMapper;

    @Override
    public PageResult<LabListVO> pagePublicLabs(String keyword, Integer status, long pageNum, long pageSize) {
        return pageLabs(keyword, status, pageNum, pageSize);
    }

    @Override
    public LabDetailVO getPublicLabDetail(Long id) {
        Lab lab = requireLab(id);
        List<MentorProfile> mentors = mentorProfileMapper.selectList(new LambdaQueryWrapper<MentorProfile>()
                .eq(MentorProfile::getLabId, id)
                .orderByAsc(MentorProfile::getId));
        Map<Long, SysUser> userMap = loadUsers(mentors.stream().map(MentorProfile::getUserId).toList());
        List<LabMentorVO> mentorVos = new ArrayList<>();
        int quotaUsed = 0;
        for (MentorProfile mentor : mentors) {
            quotaUsed += Optional.ofNullable(mentor.getQuotaUsed()).orElse(0);
            mentorVos.add(toMentorVO(mentor, userMap.get(mentor.getUserId())));
        }
        LabDetailVO vo = new LabDetailVO();
        vo.setId(lab.getId());
        vo.setLabCode(lab.getLabCode());
        vo.setLabName(lab.getLabName());
        vo.setIntroduction(lab.getIntroduction());
        vo.setResearchDirection(lab.getResearchDirection());
        vo.setEquipmentEnv(lab.getEquipmentEnv());
        vo.setTrainingPlan(lab.getTrainingPlan());
        vo.setAssessmentRequirement(lab.getAssessmentRequirement());
        vo.setOpenDayDate(lab.getOpenDayDate());
        vo.setOpenDayStartTime(lab.getOpenDayStartTime());
        vo.setOpenDayEndTime(lab.getOpenDayEndTime());
        vo.setOpenDayLocation(lab.getOpenDayLocation());
        vo.setOpenDayNote(lab.getOpenDayNote());
        int totalQuota = Optional.ofNullable(lab.getTotalQuota()).orElse(0);
        vo.setTotalQuota(totalQuota);
        vo.setQuotaUsed(quotaUsed);
        vo.setRemainQuota(Math.max(0, totalQuota - quotaUsed));
        vo.setStatus(lab.getStatus());
        vo.setMentors(mentorVos);
        return vo;
    }

    @Override
    public LabMentorVO getPublicMentor(Long id) {
        MentorProfile mentor = mentorProfileMapper.selectById(id);
        if (mentor == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "导师不存在");
        }
        return toMentorVO(mentor, sysUserMapper.selectById(mentor.getUserId()));
    }

    @Override
    public PageResult<LabListVO> pageAdminLabs(String keyword, Integer status, long pageNum, long pageSize) {
        return pageLabs(keyword, status, pageNum, pageSize);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long createLab(LabSaveReqDTO req) {
        if (labCodeExists(req.getLabCode(), null)) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "实训室编码已存在");
        }
        Lab lab = new Lab();
        fillLab(lab, req);
        lab.setStatus(req.getStatus() == null ? STATUS_OPEN : req.getStatus());
        labMapper.insert(lab);
        log.info("新建实训室，labId={}，labCode={}", lab.getId(), lab.getLabCode());
        return lab.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateLab(Long id, LabSaveReqDTO req) {
        Lab lab = requireLab(id);
        if (labCodeExists(req.getLabCode(), id)) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "实训室编码已存在");
        }
        if (req.getTotalQuota() != null) {
            int used = mentorProfileMapper.selectList(new LambdaQueryWrapper<MentorProfile>()
                            .eq(MentorProfile::getLabId, id))
                    .stream()
                    .mapToInt(mentor -> Optional.ofNullable(mentor.getQuotaUsed()).orElse(0))
                    .sum();
            if (req.getTotalQuota() < used) {
                throw new BusinessException(ResultCode.BUSINESS_ERROR,
                        "总名额不得小于已占用名额（" + used + " 人）");
            }
        }
        fillLab(lab, req);
        if (req.getStatus() != null) {
            lab.setStatus(req.getStatus());
        }
        labMapper.updateById(lab);
        log.info("修改实训室，labId={}", id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteLab(Long id) {
        requireLab(id);
        long mentorCount = mentorProfileMapper.selectCount(new LambdaQueryWrapper<MentorProfile>()
                .eq(MentorProfile::getLabId, id));
        if (mentorCount > 0) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "实训室下仍有导师，不可删除");
        }
        labMapper.deleteById(id);
        log.info("删除实训室，labId={}", id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void assignLeader(Long id, LeaderAssignReqDTO req) {
        Lab lab = requireLab(id);
        MentorProfile mentor = mentorProfileMapper.selectOne(new LambdaQueryWrapper<MentorProfile>()
                .eq(MentorProfile::getUserId, req.getUserId())
                .eq(MentorProfile::getLabId, id));
        if (mentor == null) {
            throw new BusinessException(ResultCode.FORBIDDEN, "该导师不属于本实训室");
        }
        SysUser user = sysUserMapper.selectById(req.getUserId());
        if (user == null || !Integer.valueOf(USER_TYPE_TEACHER).equals(user.getUserType())
                || !Integer.valueOf(USER_ENABLED).equals(user.getStatus())) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "目标用户不是本室在职教师");
        }
        Long previousLeader = lab.getLeaderId();
        lab.setLeaderId(req.getUserId());
        labMapper.updateById(lab);
        writeLeaderLog(lab.getId(), previousLeader, req.getUserId(), req.getReason());
        sendLeaderNotice(previousLeader, "实训室负责人变更", "你已不再担任该实训室负责人。", lab.getId());
        sendLeaderNotice(req.getUserId(), "实训室负责人任命", "你已被任命为实训室负责人。", lab.getId());
        log.info("提拔实训室负责人，labId={}，from={}，to={}", id, previousLeader, req.getUserId());
    }

    /**
     * 分页查询实训室。
     *
     * @param keyword  名称关键词
     * @param status   状态
     * @param pageNum  页码
     * @param pageSize 每页条数
     * @return 分页结果
     */
    private PageResult<LabListVO> pageLabs(String keyword, Integer status, long pageNum, long pageSize) {
        String text = StrUtil.trim(keyword);
        Page<Lab> page = labMapper.selectPage(new Page<>(pageNum, pageSize),
                new LambdaQueryWrapper<Lab>()
                        .like(StrUtil.isNotBlank(text), Lab::getLabName, text)
                        .eq(status != null, Lab::getStatus, status)
                        .orderByAsc(Lab::getId));
        List<Long> labIds = page.getRecords().stream().map(Lab::getId).toList();
        Map<Long, List<MentorProfile>> mentorsByLab = labIds.isEmpty() ? Map.of()
                : mentorProfileMapper.selectList(new LambdaQueryWrapper<MentorProfile>()
                        .in(MentorProfile::getLabId, labIds))
                .stream()
                .collect(Collectors.groupingBy(MentorProfile::getLabId));
        Map<Long, SysUser> leaderMap = loadUsers(page.getRecords().stream()
                .map(Lab::getLeaderId)
                .filter(Objects::nonNull)
                .distinct()
                .toList());
        IPage<LabListVO> result = page.convert(lab -> {
            List<MentorProfile> mentors = mentorsByLab.getOrDefault(lab.getId(), List.of());
            int quotaUsed = mentors.stream()
                    .mapToInt(mentor -> Optional.ofNullable(mentor.getQuotaUsed()).orElse(0))
                    .sum();
            int totalQuota = Optional.ofNullable(lab.getTotalQuota()).orElse(0);
            LabListVO vo = new LabListVO();
            vo.setId(lab.getId());
            vo.setLabCode(lab.getLabCode());
            vo.setLabName(lab.getLabName());
            SysUser leader = leaderMap.get(lab.getLeaderId());
            vo.setLeaderName(leader == null ? "" : leader.getRealName());
            vo.setMentorCount(mentors.size());
            vo.setTotalQuota(totalQuota);
            vo.setQuotaUsed(quotaUsed);
            vo.setRemainQuota(Math.max(0, totalQuota - quotaUsed));
            vo.setResearchDirection(lab.getResearchDirection());
            vo.setOpenDayDate(lab.getOpenDayDate());
            vo.setStatus(lab.getStatus());
            return vo;
        });
        return PageResult.of(result);
    }

    /**
     * 查询实训室，不存在返回 404001。
     *
     * @param id 实训室 ID
     * @return 实训室
     */
    private Lab requireLab(Long id) {
        Lab lab = labMapper.selectById(id);
        if (lab == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "实训室不存在");
        }
        return lab;
    }

    /**
     * 判断实训室编码是否已存在。
     *
     * @param labCode   编码
     * @param excludeId 排除的实训室 ID
     * @return 是否存在
     */
    private boolean labCodeExists(String labCode, Long excludeId) {
        return labMapper.selectCount(new LambdaQueryWrapper<Lab>()
                .eq(Lab::getLabCode, StrUtil.trim(labCode))
                .ne(excludeId != null, Lab::getId, excludeId)) > 0;
    }

    /**
     * 填充实训室字段。
     *
     * @param lab 实训室
     * @param req 请求
     */
    private void fillLab(Lab lab, LabSaveReqDTO req) {
        lab.setLabCode(StrUtil.trim(req.getLabCode()));
        lab.setLabName(StrUtil.trim(req.getLabName()));
        lab.setIntroduction(req.getIntroduction());
        lab.setResearchDirection(req.getResearchDirection());
        lab.setEquipmentEnv(req.getEquipmentEnv());
        lab.setTrainingPlan(req.getTrainingPlan());
        lab.setAssessmentRequirement(req.getAssessmentRequirement());
        lab.setOpenDayDate(req.getOpenDayDate());
        lab.setOpenDayStartTime(req.getOpenDayStartTime());
        lab.setOpenDayEndTime(req.getOpenDayEndTime());
        lab.setOpenDayLocation(req.getOpenDayLocation());
        lab.setOpenDayNote(req.getOpenDayNote());
        lab.setTotalQuota(req.getTotalQuota());
    }

    /**
     * 导师档案转简要信息。
     *
     * @param mentor 导师档案
     * @param user   教师账号
     * @return 导师简要信息
     */
    private LabMentorVO toMentorVO(MentorProfile mentor, SysUser user) {
        LabMentorVO vo = new LabMentorVO();
        vo.setId(mentor.getId());
        vo.setUserId(mentor.getUserId());
        vo.setRealName(user == null ? "" : user.getRealName());
        vo.setTitle(user == null ? "" : user.getTitle());
        vo.setResearchDirection(mentor.getResearchDirection());
        int quota = Optional.ofNullable(mentor.getQuota()).orElse(0);
        int used = Optional.ofNullable(mentor.getQuotaUsed()).orElse(0);
        vo.setQuota(quota);
        vo.setQuotaUsed(used);
        vo.setRemainQuota(Math.max(0, quota - used));
        return vo;
    }

    /**
     * 批量加载用户。
     *
     * @param userIds 用户 ID 列表
     * @return 用户映射
     */
    private Map<Long, SysUser> loadUsers(List<Long> userIds) {
        if (userIds.isEmpty()) {
            return new HashMap<>();
        }
        return sysUserMapper.selectBatchIds(userIds).stream()
                .collect(Collectors.toMap(SysUser::getId, Function.identity(), (first, second) -> first));
    }

    /**
     * 写负责人变更日志。
     *
     * @param labId    实训室 ID
     * @param before   原负责人
     * @param after    新负责人
     * @param reason   理由
     */
    private void writeLeaderLog(Long labId, Long before, Long after, String reason) {
        OperationLog operationLog = new OperationLog();
        operationLog.setOperatorId(0L);
        operationLog.setOperatorName("管理员");
        operationLog.setBizType("LEADER");
        operationLog.setBizId(labId);
        operationLog.setAction("提拔实训室负责人");
        operationLog.setBeforeValue(before == null ? null : String.valueOf(before));
        operationLog.setAfterValue(String.valueOf(after));
        operationLog.setReason(reason);
        operationLogMapper.insert(operationLog);
    }

    /**
     * 发送负责人变更通知。
     *
     * @param userId  接收人
     * @param title   标题
     * @param content 内容
     * @param labId   实训室 ID
     */
    private void sendLeaderNotice(Long userId, String title, String content, Long labId) {
        if (userId == null) {
            return;
        }
        UserNotice notice = new UserNotice();
        notice.setUserId(userId);
        notice.setTitle(title);
        notice.setContent(content);
        notice.setNoticeType(NOTICE_TYPE_SYSTEM);
        notice.setBizType("LEADER");
        notice.setBizId(labId);
        notice.setIsRead(0);
        try {
            userNoticeMapper.insert(notice);
        } catch (Exception exception) {
            log.info("负责人通知已存在，忽略重复写入，userId={}", userId);
        }
    }
}
