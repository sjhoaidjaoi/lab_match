package com.college.labselect.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.college.labselect.common.PageResult;
import com.college.labselect.common.ResultCode;
import com.college.labselect.dto.req.MentorCreateReqDTO;
import com.college.labselect.dto.req.MentorQuotaReqDTO;
import com.college.labselect.dto.req.MentorStatusReqDTO;
import com.college.labselect.dto.req.MentorUpdateReqDTO;
import com.college.labselect.dto.resp.MentorListVO;
import com.college.labselect.dto.resp.QuotaOverviewVO;
import com.college.labselect.entity.Lab;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.Notice;
import com.college.labselect.entity.OperationLog;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.entity.SysUser;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.LabMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.NoticeMapper;
import com.college.labselect.mapper.OperationLogMapper;
import com.college.labselect.mapper.SelectionRoundMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.service.IMentorService;
import com.college.labselect.utils.SimpleXlsxWriter;
import com.college.labselect.utils.StudentExcelParser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 导师与名额服务实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MentorServiceImpl implements IMentorService {

    private static final int USER_TYPE_TEACHER = 2;
    private static final int STATUS_ENABLED = 1;
    private static final int NEED_CHANGE_PWD = 1;
    private static final int NOTICE_TYPE_NOTICE = 4;
    private static final int NOTICE_PUBLISHED = 2;
    private static final int TEACHER_EXCEL_COLUMNS = 7;

    private final MentorProfileMapper mentorProfileMapper;
    private final SysUserMapper sysUserMapper;
    private final LabMapper labMapper;
    private final SelectionRoundMapper selectionRoundMapper;
    private final PasswordEncoder passwordEncoder;
    private final OperationLogMapper operationLogMapper;
    private final NoticeMapper noticeMapper;
    private final StudentExcelParser studentExcelParser;

    @Value("${lab-select.default-password:123456}")
    private String defaultPassword = "123456";

    @Override
    public PageResult<MentorListVO> pageAdminMentors(Long labId, String keyword, Integer status,
                                                      long pageNum, long pageSize) {
        List<Long> labUserIds = null;
        if (labId != null) {
            labUserIds = mentorProfileMapper.selectList(new LambdaQueryWrapper<MentorProfile>()
                            .eq(MentorProfile::getLabId, labId))
                    .stream()
                    .map(MentorProfile::getUserId)
                    .toList();
            if (labUserIds.isEmpty()) {
                return new PageResult<>(0L, pageNum, pageSize, List.of());
            }
        }
        String text = StrUtil.trim(keyword);
        Page<SysUser> page = sysUserMapper.selectPage(new Page<>(pageNum, pageSize),
                new LambdaQueryWrapper<SysUser>()
                        .eq(SysUser::getUserType, USER_TYPE_TEACHER)
                        .eq(status != null, SysUser::getStatus, status)
                        .in(labUserIds != null, SysUser::getId, labUserIds)
                        .and(StrUtil.isNotBlank(text), query -> query.like(SysUser::getUserNo, text)
                                .or()
                                .like(SysUser::getRealName, text))
                        .orderByAsc(SysUser::getUserNo));
        List<Long> userIds = page.getRecords().stream().map(SysUser::getId).toList();
        Map<Long, MentorProfile> profileMap = userIds.isEmpty() ? Map.of()
                : mentorProfileMapper.selectList(new LambdaQueryWrapper<MentorProfile>()
                        .in(MentorProfile::getUserId, userIds))
                .stream()
                .collect(Collectors.toMap(MentorProfile::getUserId, Function.identity(), (first, second) -> first));
        Map<Long, Lab> labMap = loadLabs(profileMap.values().stream()
                .map(MentorProfile::getLabId).distinct().toList());
        IPage<MentorListVO> result = page.convert(user -> toVO(user, profileMap.get(user.getId()),
                labMap.get(profileMap.containsKey(user.getId()) ? profileMap.get(user.getId()).getLabId() : null)));
        return PageResult.of(result);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long createMentor(MentorCreateReqDTO req) {
        if (userNoExists(req.getUserNo())) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "工号已存在");
        }
        Lab lab = requireLab(req.getLabId());
        validateQuotaSum(lab, null, req.getQuota());
        int status = req.getStatus() == null ? STATUS_ENABLED : req.getStatus();
        SysUser user = new SysUser();
        user.setUserNo(StrUtil.trim(req.getUserNo()));
        user.setPassword(passwordEncoder.encode(defaultPassword));
        user.setRealName(req.getRealName());
        user.setUserType(USER_TYPE_TEACHER);
        user.setTitle(req.getTitle());
        user.setStatus(status);
        user.setNeedChangePwd(NEED_CHANGE_PWD);
        sysUserMapper.insert(user);
        MentorProfile profile = new MentorProfile();
        profile.setUserId(user.getId());
        profile.setLabId(lab.getId());
        profile.setResearchDirection(req.getResearchDirection());
        profile.setQuota(req.getQuota());
        profile.setQuotaUsed(0);
        profile.setVersion(0);
        profile.setStatus(status);
        mentorProfileMapper.insert(profile);
        log.info("新增教师账号，userId={}，mentorId={}", user.getId(), profile.getId());
        return profile.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateMentor(Long id, MentorUpdateReqDTO req) {
        MentorProfile profile = requireMentor(id);
        SysUser user = requireUser(profile.getUserId());
        Lab lab = requireLab(req.getLabId());
        if (req.getQuota() < Optional.ofNullable(profile.getQuotaUsed()).orElse(0)) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR,
                    "新名额不得小于已占用名额（" + profile.getQuotaUsed() + " 人）");
        }
        validateQuotaSum(lab, id, req.getQuota());
        user.setRealName(req.getRealName());
        user.setTitle(req.getTitle());
        if (req.getStatus() != null) {
            user.setStatus(req.getStatus());
        }
        sysUserMapper.updateById(user);
        profile.setLabId(lab.getId());
        profile.setResearchDirection(req.getResearchDirection());
        profile.setQuota(req.getQuota());
        if (req.getStatus() != null) {
            profile.setStatus(req.getStatus());
        }
        mentorProfileMapper.updateById(profile);
        log.info("编辑教师账号，mentorId={}", id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void importMentors(MultipartFile file) {
        List<StudentExcelParser.RawRow> rows = studentExcelParser.parseRaw(file, TEACHER_EXCEL_COLUMNS);
        if (rows.isEmpty()) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "Excel 无有效数据");
        }
        int success = 0;
        for (StudentExcelParser.RawRow row : rows) {
            String[] values = row.getValues();
            String userNo = StrUtil.trim(values[0]);
            String realName = StrUtil.trim(values[1]);
            String labCode = StrUtil.trim(values[2]);
            try {
                if (StrUtil.isBlank(userNo) || StrUtil.isBlank(realName)) {
                    log.warn("教师导入跳过，行={}，工号或姓名为空", row.getRowNo());
                    continue;
                }
                if (userNoExists(userNo)) {
                    log.warn("教师导入跳过，行={}，工号已存在={}", row.getRowNo(), userNo);
                    continue;
                }
                Lab lab = labMapper.selectOne(new LambdaQueryWrapper<Lab>().eq(Lab::getLabCode, labCode));
                if (lab == null) {
                    log.warn("教师导入跳过，行={}，实训室编码不存在={}", row.getRowNo(), labCode);
                    continue;
                }
                SysUser user = new SysUser();
                user.setUserNo(userNo);
                user.setPassword(passwordEncoder.encode(defaultPassword));
                user.setRealName(realName);
                user.setUserType(USER_TYPE_TEACHER);
                user.setTitle(values[3]);
                user.setPhone(values[5]);
                user.setEmail(values[6]);
                user.setStatus(STATUS_ENABLED);
                user.setNeedChangePwd(NEED_CHANGE_PWD);
                sysUserMapper.insert(user);
                MentorProfile profile = new MentorProfile();
                profile.setUserId(user.getId());
                profile.setLabId(lab.getId());
                profile.setResearchDirection(values[4]);
                profile.setQuota(0);
                profile.setQuotaUsed(0);
                profile.setVersion(0);
                profile.setStatus(STATUS_ENABLED);
                mentorProfileMapper.insert(profile);
                success++;
            } catch (Exception exception) {
                log.warn("教师导入失败，行={}，userNo={}，reason={}",
                        row.getRowNo(), userNo, exception.getMessage());
            }
        }
        log.info("批量导入教师完成，total={}，success={}", rows.size(), success);
        if (success == 0) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "教师导入全部失败，请检查工号与实训室编码");
        }
    }

    @Override
    public void resetPassword(Long id) {
        MentorProfile profile = requireMentor(id);
        SysUser user = requireUser(profile.getUserId());
        user.setPassword(passwordEncoder.encode(defaultPassword));
        user.setNeedChangePwd(NEED_CHANGE_PWD);
        sysUserMapper.updateById(user);
        log.info("重置教师密码，mentorId={}", id);
    }

    @Override
    public void updateStatus(Long id, MentorStatusReqDTO req) {
        MentorProfile profile = requireMentor(id);
        SysUser user = requireUser(profile.getUserId());
        int beforeStatus = Optional.ofNullable(profile.getStatus()).orElse(0);
        user.setStatus(req.getStatus());
        sysUserMapper.updateById(user);
        profile.setStatus(req.getStatus());
        mentorProfileMapper.updateById(profile);
        writeLog(0L, "管理员", "MENTOR", id, "启用/禁用教师",
                String.valueOf(beforeStatus), String.valueOf(req.getStatus()), null);
        log.info("更新教师状态，mentorId={}，status={}", id, req.getStatus());
    }

    @Override
    public List<MentorListVO> listLeaderMentors(Long leaderUserId) {
        Lab lab = labMapper.selectOne(new LambdaQueryWrapper<Lab>().eq(Lab::getLeaderId, leaderUserId));
        if (lab == null) {
            throw new BusinessException(ResultCode.FORBIDDEN, "仅实训室负责人可查看本室导师");
        }
        List<MentorProfile> profiles = mentorProfileMapper.selectList(new LambdaQueryWrapper<MentorProfile>()
                .eq(MentorProfile::getLabId, lab.getId())
                .orderByAsc(MentorProfile::getId));
        Map<Long, SysUser> userMap = loadUsers(profiles.stream().map(MentorProfile::getUserId).toList());
        List<MentorListVO> result = new ArrayList<>();
        for (MentorProfile profile : profiles) {
            result.add(toVO(userMap.get(profile.getUserId()), profile, lab));
        }
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void adjustQuotaByLeader(Long leaderUserId, Long mentorId, MentorQuotaReqDTO req) {
        Lab lab = labMapper.selectOne(new LambdaQueryWrapper<Lab>().eq(Lab::getLeaderId, leaderUserId));
        if (lab == null) {
            throw new BusinessException(ResultCode.FORBIDDEN, "仅实训室负责人可调整本室名额");
        }
        MentorProfile profile = requireMentor(mentorId);
        if (!Objects.equals(profile.getLabId(), lab.getId())) {
            throw new BusinessException(ResultCode.FORBIDDEN, "无权调整其他实训室导师名额");
        }
        SelectionRound firstRound = selectionRoundMapper.selectOne(new LambdaQueryWrapper<SelectionRound>()
                .orderByAsc(SelectionRound::getRoundNo)
                .last("LIMIT 1"));
        if (firstRound != null && firstRound.getApplyStart() != null
                && !LocalDateTime.now().isBefore(firstRound.getApplyStart())) {
            throw new BusinessException(ResultCode.OUT_OF_TIME_WINDOW, "名额已冻结，请走管理员强制调整");
        }
        int before = Optional.ofNullable(profile.getQuota()).orElse(0);
        validateUsed(profile, req.getQuota());
        validateQuotaSum(lab, mentorId, req.getQuota());
        profile.setQuota(req.getQuota());
        mentorProfileMapper.updateById(profile);
        SysUser operator = sysUserMapper.selectById(leaderUserId);
        writeLog(leaderUserId, operator == null ? "" : operator.getRealName(), "QUOTA", mentorId,
                "负责人调整导师名额", String.valueOf(before), String.valueOf(req.getQuota()), req.getReason());
        log.info("负责人调整导师名额，mentorId={}，quota={}", mentorId, req.getQuota());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void forceAdjustQuota(Long mentorId, MentorQuotaReqDTO req) {
        MentorProfile profile = requireMentor(mentorId);
        Lab lab = requireLab(profile.getLabId());
        int before = Optional.ofNullable(profile.getQuota()).orElse(0);
        validateUsed(profile, req.getQuota());
        validateQuotaSum(lab, mentorId, req.getQuota());
        profile.setQuota(req.getQuota());
        mentorProfileMapper.updateById(profile);
        writeLog(0L, "管理员", "QUOTA", mentorId, "强制调整导师名额",
                String.valueOf(before), String.valueOf(req.getQuota()), req.getReason());
        publishQuotaNotice(lab, profile, before, req.getQuota(), req.getReason());
        log.info("强制调整导师名额，mentorId={}，quota={}", mentorId, req.getQuota());
    }

    @Override
    public List<QuotaOverviewVO> quotaOverview() {
        List<Lab> labs = labMapper.selectList(new LambdaQueryWrapper<Lab>().orderByAsc(Lab::getId));
        if (labs.isEmpty()) {
            return List.of();
        }
        Map<Long, List<MentorProfile>> byLab = mentorProfileMapper.selectList(new LambdaQueryWrapper<MentorProfile>()
                        .in(MentorProfile::getLabId, labs.stream().map(Lab::getId).toList()))
                .stream()
                .collect(Collectors.groupingBy(MentorProfile::getLabId));
        List<QuotaOverviewVO> result = new ArrayList<>();
        for (Lab lab : labs) {
            List<MentorProfile> profiles = byLab.getOrDefault(lab.getId(), List.of());
            int quotaSum = profiles.stream().mapToInt(item -> Optional.ofNullable(item.getQuota()).orElse(0)).sum();
            int usedSum = profiles.stream()
                    .mapToInt(item -> Optional.ofNullable(item.getQuotaUsed()).orElse(0)).sum();
            int totalQuota = Optional.ofNullable(lab.getTotalQuota()).orElse(0);
            QuotaOverviewVO vo = new QuotaOverviewVO();
            vo.setLabId(lab.getId());
            vo.setLabName(lab.getLabName());
            vo.setTotalQuota(totalQuota);
            vo.setQuotaSum(quotaSum);
            vo.setQuotaUsedSum(usedSum);
            vo.setRemainQuota(Math.max(0, totalQuota - usedSum));
            result.add(vo);
        }
        return result;
    }

    @Override
    public byte[] exportQuotas() {
        List<String> headers = List.of("实训室", "总名额", "导师名额合计", "已占用", "剩余名额");
        List<List<String>> rows = quotaOverview().stream()
                .map(item -> List.of(item.getLabName(), String.valueOf(item.getTotalQuota()),
                        String.valueOf(item.getQuotaSum()), String.valueOf(item.getQuotaUsedSum()),
                        String.valueOf(item.getRemainQuota())))
                .toList();
        return SimpleXlsxWriter.write(headers, rows);
    }

    /**
     * 查询导师档案。
     *
     * @param id 导师档案 ID
     * @return 导师档案
     */
    private MentorProfile requireMentor(Long id) {
        MentorProfile profile = mentorProfileMapper.selectById(id);
        if (profile == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "导师不存在");
        }
        return profile;
    }

    /**
     * 查询教师账号。
     *
     * @param userId 用户 ID
     * @return 教师账号
     */
    private SysUser requireUser(Long userId) {
        SysUser user = sysUserMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "教师账号不存在");
        }
        return user;
    }

    /**
     * 查询实训室。
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
     * 判断工号是否已存在。
     *
     * @param userNo 工号
     * @return 是否存在
     */
    private boolean userNoExists(String userNo) {
        return sysUserMapper.selectCount(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getUserNo, StrUtil.trim(userNo))) > 0;
    }

    /**
     * 校验新名额不小于已占用名额。
     *
     * @param profile 导师档案
     * @param quota   新名额
     */
    private void validateUsed(MentorProfile profile, int quota) {
        int used = Optional.ofNullable(profile.getQuotaUsed()).orElse(0);
        if (quota < used) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR,
                    "新名额不得小于已占用名额（" + used + " 人，含待确认占位）");
        }
    }

    /**
     * 校验本室导师名额合计不超过实训室总名额。
     *
     * @param lab       实训室
     * @param excludeId 排除的导师档案 ID
     * @param quota     新名额
     */
    private void validateQuotaSum(Lab lab, Long excludeId, int quota) {
        int total = Optional.ofNullable(lab.getTotalQuota()).orElse(0);
        int sum = mentorProfileMapper.selectList(new LambdaQueryWrapper<MentorProfile>()
                        .eq(MentorProfile::getLabId, lab.getId())
                        .ne(excludeId != null, MentorProfile::getId, excludeId))
                .stream()
                .mapToInt(item -> Optional.ofNullable(item.getQuota()).orElse(0))
                .sum();
        if (sum + quota > total) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR,
                    "本室导师名额之和超出实训室总名额（" + total + " 人）");
        }
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
     * 批量加载实训室。
     *
     * @param labIds 实训室 ID 列表
     * @return 实训室映射
     */
    private Map<Long, Lab> loadLabs(List<Long> labIds) {
        if (labIds.isEmpty()) {
            return new HashMap<>();
        }
        return labMapper.selectBatchIds(labIds).stream()
                .collect(Collectors.toMap(Lab::getId, Function.identity(), (first, second) -> first));
    }

    /**
     * 构建导师列表项。
     *
     * @param user    教师账号
     * @param profile 导师档案
     * @param lab     实训室
     * @return 列表项
     */
    private MentorListVO toVO(SysUser user, MentorProfile profile, Lab lab) {
        MentorListVO vo = new MentorListVO();
        vo.setId(profile == null ? null : profile.getId());
        vo.setUserId(user == null ? null : user.getId());
        vo.setUserNo(user == null ? "" : user.getUserNo());
        vo.setRealName(user == null ? "" : user.getRealName());
        vo.setLabId(profile == null ? null : profile.getLabId());
        vo.setLabName(lab == null ? "" : lab.getLabName());
        vo.setTitle(user == null ? "" : user.getTitle());
        vo.setResearchDirection(profile == null ? "" : profile.getResearchDirection());
        int quota = profile == null ? 0 : Optional.ofNullable(profile.getQuota()).orElse(0);
        int used = profile == null ? 0 : Optional.ofNullable(profile.getQuotaUsed()).orElse(0);
        vo.setQuota(quota);
        vo.setQuotaUsed(used);
        vo.setRemainQuota(Math.max(0, quota - used));
        vo.setStatus(profile == null ? null : profile.getStatus());
        vo.setAccountStatus(user == null ? null : user.getStatus());
        return vo;
    }

    /**
     * 写名额 / 状态变更日志。
     *
     * @param operatorId   操作人 ID
     * @param operatorName 操作人姓名
     * @param bizType      业务类型
     * @param bizId        业务主键
     * @param action       动作
     * @param before       变更前
     * @param after        变更后
     * @param reason       理由
     */
    private void writeLog(Long operatorId, String operatorName, String bizType, Long bizId,
                          String action, String before, String after, String reason) {
        OperationLog operationLog = new OperationLog();
        operationLog.setOperatorId(operatorId);
        operationLog.setOperatorName(operatorName);
        operationLog.setBizType(bizType);
        operationLog.setBizId(bizId);
        operationLog.setAction(action);
        operationLog.setBeforeValue(before);
        operationLog.setAfterValue(after);
        operationLog.setReason(reason);
        operationLogMapper.insert(operationLog);
    }

    /**
     * 发布强制名额调整公告。
     *
     * @param lab    实训室
     * @param profile 导师档案
     * @param before 原名额
     * @param after  新名额
     * @param reason 理由
     */
    private void publishQuotaNotice(Lab lab, MentorProfile profile, int before, int after, String reason) {
        Notice notice = new Notice();
        notice.setTitle("导师名额调整公告");
        notice.setNoticeType(NOTICE_TYPE_NOTICE);
        notice.setContent("实训室「" + lab.getLabName() + "」导师名额由 " + before + " 调整为 " + after
                + "，调整理由：" + reason);
        notice.setStatus(NOTICE_PUBLISHED);
        notice.setPublishTime(LocalDateTime.now());
        notice.setPublisherId(0L);
        noticeMapper.insert(notice);
    }
}
