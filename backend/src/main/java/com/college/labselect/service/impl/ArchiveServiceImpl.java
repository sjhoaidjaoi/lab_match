package com.college.labselect.service.impl;

import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.college.labselect.common.PageResult;
import com.college.labselect.common.ResultCode;
import com.college.labselect.common.StatusTextUtils;
import com.college.labselect.dto.req.RoundLockReqDTO;
import com.college.labselect.dto.req.RoundUnlockReqDTO;
import com.college.labselect.dto.req.SnapshotCreateReqDTO;
import com.college.labselect.dto.resp.ResultOverviewVO;
import com.college.labselect.dto.resp.ResultRowVO;
import com.college.labselect.dto.resp.RoundLockRespVO;
import com.college.labselect.dto.resp.RoundUnlockRespVO;
import com.college.labselect.dto.resp.SnapshotCreateRespVO;
import com.college.labselect.entity.Admission;
import com.college.labselect.entity.Lab;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.OperationLog;
import com.college.labselect.entity.Publicity;
import com.college.labselect.entity.RoundSnapshot;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.entity.SysUser;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.AdmissionMapper;
import com.college.labselect.mapper.LabMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.OperationLogMapper;
import com.college.labselect.mapper.PublicityMapper;
import com.college.labselect.mapper.RoundSnapshotMapper;
import com.college.labselect.mapper.SelectionRoundMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.service.IArchiveService;
import com.college.labselect.utils.SimpleXlsxWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
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
 * 轮次快照与批次归档服务实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ArchiveServiceImpl implements IArchiveService {

    private static final int SNAPSHOT_FINAL = 4;
    private static final int PUBLICITY_ONGOING = 1;
    private static final int PUBLICITY_CONFIRMED = 3;
    private static final int STATUS_PENDING = 1;
    private static final int STATUS_CONFIRMED = 2;
    private static final int STATUS_ENROLLED = 3;
    private static final int LOCKED = 1;
    private static final int UNLOCKED = 0;
    private static final int EXPORT_MAX_ROWS = 10000;

    private final SelectionRoundMapper selectionRoundMapper;

    private final RoundSnapshotMapper roundSnapshotMapper;

    private final AdmissionMapper admissionMapper;

    private final PublicityMapper publicityMapper;

    private final OperationLogMapper operationLogMapper;

    private final SysUserMapper sysUserMapper;

    private final LabMapper labMapper;

    private final MentorProfileMapper mentorProfileMapper;

    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public SnapshotCreateRespVO generateSnapshot(Long operatorId, Long roundId, SnapshotCreateReqDTO req) {
        SelectionRound round = requireRound(roundId);
        Integer snapshotType = req == null ? null : req.getSnapshotType();
        if (snapshotType == null || snapshotType < 1 || snapshotType > SNAPSHOT_FINAL) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "快照类型不合法");
        }
        RoundSnapshot snapshot = buildSnapshot(round, snapshotType, operatorId);
        SnapshotCreateRespVO resp = new SnapshotCreateRespVO();
        resp.setId(snapshot.getId());
        resp.setVersion(snapshot.getVersion());
        resp.setRecordCount(snapshot.getRecordCount());
        log.info("生成轮次快照，roundId={}，type={}，version={}，count={}", round.getId(),
                snapshotType, snapshot.getVersion(), snapshot.getRecordCount());
        return resp;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public RoundLockRespVO lockRound(Long operatorId, Long roundId, RoundLockReqDTO req) {
        SelectionRound round = requireRound(roundId);
        SelectionRound latest = selectionRoundMapper.selectOne(new LambdaQueryWrapper<SelectionRound>()
                .orderByDesc(SelectionRound::getRoundNo)
                .last("LIMIT 1"));
        if (latest != null && round.getRoundNo() != null && latest.getRoundNo() != null
                && round.getRoundNo() < latest.getRoundNo()) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "仅最后一轮可锁定");
        }
        if (currentFinalSnapshot(round.getId()) == null) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "请先生成最终归档快照");
        }
        Publicity publicity = latestPublicity(round.getId());
        if (publicity == null || !Integer.valueOf(PUBLICITY_CONFIRMED).equals(publicity.getStatus())) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "公示尚未确认，不可锁定");
        }
        long pending = admissionMapper.selectCount(new LambdaQueryWrapper<Admission>()
                .eq(Admission::getRoundId, round.getId())
                .eq(Admission::getStatus, STATUS_PENDING));
        if (pending > 0) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "仍有待确认录取，不可锁定");
        }
        round.setLocked(LOCKED);
        selectionRoundMapper.updateById(round);
        LocalDateTime lockedAt = LocalDateTime.now().withNano(0);
        writeLog(operatorId, "ROUND", round.getId(), "批次锁定", "locked=0", "locked=1", req.getReason());
        RoundLockRespVO resp = new RoundLockRespVO();
        resp.setLocked(LOCKED);
        resp.setLockedAt(lockedAt);
        log.info("批次锁定，roundId={}", round.getId());
        return resp;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public RoundUnlockRespVO unlockRound(Long operatorId, Long roundId, RoundUnlockReqDTO req) {
        SelectionRound round = requireRound(roundId);
        if (!Integer.valueOf(LOCKED).equals(round.getLocked())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "批次未锁定");
        }
        SysUser admin = sysUserMapper.selectById(operatorId);
        if (admin == null || !passwordEncoder.matches(req.getConfirmPassword(), admin.getPassword())) {
            throw new BusinessException(ResultCode.LOGIN_FAILED, "密码校验失败");
        }
        round.setLocked(UNLOCKED);
        selectionRoundMapper.updateById(round);
        Publicity publicity = latestPublicity(round.getId());
        if (publicity != null && Integer.valueOf(PUBLICITY_CONFIRMED).equals(publicity.getStatus())) {
            publicity.setStatus(PUBLICITY_ONGOING);
            publicityMapper.updateById(publicity);
        }
        if (currentFinalSnapshot(round.getId()) != null) {
            buildSnapshot(round, SNAPSHOT_FINAL, operatorId);
        }
        LocalDateTime unlockedAt = LocalDateTime.now().withNano(0);
        writeLog(operatorId, "ROUND", round.getId(), "批次解锁", "locked=1", "locked=0", req.getReason());
        RoundUnlockRespVO resp = new RoundUnlockRespVO();
        resp.setLocked(UNLOCKED);
        resp.setUnlockedAt(unlockedAt);
        log.info("批次解锁，roundId={}", round.getId());
        return resp;
    }

    @Override
    public ResultOverviewVO resultOverview(Long roundId, Long labId, Long mentorId, String keyword,
                                           Integer status, long pageNum, long pageSize) {
        SelectionRound round = roundId == null ? latestRound() : selectionRoundMapper.selectById(roundId);
        ResultOverviewVO result = new ResultOverviewVO();
        result.setRoundId(round == null ? roundId : round.getId());
        result.setArchived(0);
        result.setTotalQuota(0);
        result.setTotalAdmitted(0);
        result.setTotalConfirmed(0);
        result.setTotalEnrolled(0);
        result.setSaturationRate(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        result.setPage(emptyPage(pageNum, pageSize));
        if (round == null) {
            return result;
        }
        RoundSnapshot snapshot = Integer.valueOf(LOCKED).equals(round.getLocked())
                ? currentFinalSnapshot(round.getId()) : null;
        boolean archived = snapshot != null;
        List<ResultRowVO> rows = archived
                ? parseSnapshot(snapshot) : loadRealtimeRows(round.getId(), labId, mentorId, status);
        List<ResultRowVO> filtered = filterRows(rows, labId, mentorId, keyword, status);
        int totalQuota = sumTotalQuota(labId);
        result.setArchived(archived ? 1 : 0);
        result.setTotalQuota(totalQuota);
        result.setTotalAdmitted(filtered.size());
        result.setTotalConfirmed((int) filtered.stream()
                .filter(row -> Objects.equals(row.getStatus(), STATUS_CONFIRMED)
                        || Objects.equals(row.getStatus(), STATUS_ENROLLED)).count());
        result.setTotalEnrolled((int) filtered.stream()
                .filter(row -> Objects.equals(row.getStatus(), STATUS_ENROLLED)).count());
        result.setSaturationRate(calculateSaturation(filtered.size(), totalQuota));
        result.setPage(paginate(filtered, pageNum, pageSize));
        return result;
    }

    @Override
    public byte[] exportResults(Long roundId, Long labId, Long mentorId) {
        ResultOverviewVO overview = resultOverview(roundId, labId, mentorId, null, null, 1, EXPORT_MAX_ROWS);
        List<String> headers = List.of("学号", "姓名", "学院", "专业", "年级", "实训室",
                "导师", "总分", "状态", "来源", "确认时间");
        List<List<String>> rows = overview.getPage().getList().stream()
                .map(row -> List.of(StrUtil.nullToEmpty(row.getStudentNo()),
                        StrUtil.nullToEmpty(row.getStudentName()),
                        StrUtil.nullToEmpty(row.getCollege()),
                        StrUtil.nullToEmpty(row.getMajor()),
                        StrUtil.nullToEmpty(row.getGrade()),
                        StrUtil.nullToEmpty(row.getLabName()),
                        StrUtil.nullToEmpty(row.getMentorName()),
                        row.getTotalScore() == null ? "" : row.getTotalScore().toPlainString(),
                        StrUtil.nullToEmpty(row.getStatusText()),
                        StrUtil.nullToEmpty(row.getSourceTypeText()),
                        row.getConfirmTime() == null ? "" : row.getConfirmTime().toString()))
                .toList();
        return SimpleXlsxWriter.write(headers, rows);
    }

    /**
     * 生成并写入新版本快照，同轮同类型旧版本置为非当前。
     *
     * @param round        轮次
     * @param snapshotType 快照类型
     * @param operatorId   操作人用户 ID
     * @return 新快照实体
     */
    private RoundSnapshot buildSnapshot(SelectionRound round, int snapshotType, Long operatorId) {
        List<ResultRowVO> rows = loadRealtimeRows(round.getId(), null, null, null);
        RoundSnapshot previous = roundSnapshotMapper.selectOne(new LambdaQueryWrapper<RoundSnapshot>()
                .eq(RoundSnapshot::getRoundId, round.getId())
                .eq(RoundSnapshot::getSnapshotType, snapshotType)
                .eq(RoundSnapshot::getIsCurrent, 1)
                .orderByDesc(RoundSnapshot::getVersion)
                .last("LIMIT 1"));
        int version = 1;
        if (previous != null) {
            version = Optional.ofNullable(previous.getVersion()).orElse(0) + 1;
            previous.setIsCurrent(0);
            roundSnapshotMapper.updateById(previous);
        }
        RoundSnapshot snapshot = new RoundSnapshot();
        snapshot.setRoundId(round.getId());
        snapshot.setSnapshotType(snapshotType);
        snapshot.setContent(JSONUtil.toJsonStr(rows));
        snapshot.setRecordCount(rows.size());
        snapshot.setVersion(version);
        snapshot.setIsCurrent(1);
        snapshot.setOperatorId(operatorId);
        roundSnapshotMapper.insert(snapshot);
        return snapshot;
    }

    /**
     * 从实时录取表装配总览行。
     *
     * @param roundId  轮次 ID
     * @param labId    实训室 ID，可空
     * @param mentorId 导师档案 ID，可空
     * @param status   录取状态，可空
     * @return 总览行
     */
    private List<ResultRowVO> loadRealtimeRows(Long roundId, Long labId, Long mentorId, Integer status) {
        LambdaQueryWrapper<Admission> wrapper = new LambdaQueryWrapper<Admission>()
                .eq(Admission::getRoundId, roundId)
                .eq(labId != null, Admission::getLabId, labId)
                .eq(mentorId != null, Admission::getMentorId, mentorId)
                .eq(status != null, Admission::getStatus, status)
                .orderByAsc(Admission::getId);
        List<Admission> admissions = admissionMapper.selectList(wrapper);
        if (admissions.isEmpty()) {
            return new ArrayList<>();
        }
        Map<Long, SysUser> studentMap = loadUsers(admissions.stream()
                .map(Admission::getStudentId).distinct().toList());
        Map<Long, Lab> labMap = loadLabs(admissions.stream()
                .map(Admission::getLabId).distinct().toList());
        Map<Long, MentorProfile> mentorMap = loadMentors(admissions.stream()
                .map(Admission::getMentorId).distinct().toList());
        Map<Long, SysUser> mentorUserMap = loadUsers(mentorMap.values().stream()
                .map(MentorProfile::getUserId).distinct().toList());
        List<ResultRowVO> rows = new ArrayList<>();
        for (Admission admission : admissions) {
            rows.add(buildRow(admission, studentMap, labMap, mentorMap, mentorUserMap));
        }
        return rows;
    }

    /**
     * 装配单条总览行。
     *
     * @param admission     录取记录
     * @param studentMap    学生映射
     * @param labMap        实训室映射
     * @param mentorMap     导师映射
     * @param mentorUserMap 导师账号映射
     * @return 总览行
     */
    private ResultRowVO buildRow(Admission admission, Map<Long, SysUser> studentMap,
                                 Map<Long, Lab> labMap, Map<Long, MentorProfile> mentorMap,
                                 Map<Long, SysUser> mentorUserMap) {
        ResultRowVO row = new ResultRowVO();
        row.setAdmissionId(admission.getId());
        row.setStudentId(admission.getStudentId());
        SysUser student = studentMap.get(admission.getStudentId());
        if (student != null) {
            row.setStudentNo(student.getUserNo());
            row.setStudentName(student.getRealName());
            row.setCollege(student.getCollege());
            row.setMajor(student.getMajor());
            row.setGrade(student.getGrade());
        }
        row.setLabId(admission.getLabId());
        Lab lab = labMap.get(admission.getLabId());
        row.setLabName(lab == null ? "" : lab.getLabName());
        row.setMentorId(admission.getMentorId());
        MentorProfile mentor = mentorMap.get(admission.getMentorId());
        SysUser mentorUser = mentor == null ? null : mentorUserMap.get(mentor.getUserId());
        row.setMentorName(mentorUser == null ? "" : mentorUser.getRealName());
        row.setTotalScore(admission.getTotalScore());
        row.setStatus(admission.getStatus());
        row.setStatusText(StatusTextUtils.admissionStatus(admission.getStatus()));
        row.setSourceType(admission.getSourceType());
        row.setSourceTypeText(StatusTextUtils.sourceType(admission.getSourceType()));
        row.setConfirmTime(admission.getConfirmTime());
        return row;
    }

    /**
     * 解析归档快照内容。
     *
     * @param snapshot 归档快照
     * @return 总览行
     */
    private List<ResultRowVO> parseSnapshot(RoundSnapshot snapshot) {
        if (StrUtil.isBlank(snapshot.getContent())) {
            return new ArrayList<>();
        }
        List<ResultRowVO> rows = JSONUtil.toList(snapshot.getContent(), ResultRowVO.class);
        for (ResultRowVO row : rows) {
            row.setStatusText(StatusTextUtils.admissionStatus(row.getStatus()));
            row.setSourceTypeText(StatusTextUtils.sourceType(row.getSourceType()));
        }
        return rows;
    }

    /**
     * 按实训室、导师、关键词与状态过滤总览行。
     *
     * @param rows     总览行
     * @param labId    实训室 ID，可空
     * @param mentorId 导师档案 ID，可空
     * @param keyword  学号或姓名关键词，可空
     * @param status   录取状态，可空
     * @return 过滤后的总览行
     */
    private List<ResultRowVO> filterRows(List<ResultRowVO> rows, Long labId, Long mentorId,
                                         String keyword, Integer status) {
        String text = StrUtil.trim(keyword);
        return rows.stream()
                .filter(row -> labId == null || Objects.equals(row.getLabId(), labId))
                .filter(row -> mentorId == null || Objects.equals(row.getMentorId(), mentorId))
                .filter(row -> status == null || Objects.equals(row.getStatus(), status))
                .filter(row -> StrUtil.isBlank(text)
                        || StrUtil.containsIgnoreCase(row.getStudentNo(), text)
                        || StrUtil.containsIgnoreCase(row.getStudentName(), text))
                .toList();
    }

    /**
     * 统计实训室总名额。
     *
     * @param labId 实训室 ID，可空表示全部
     * @return 总名额
     */
    private int sumTotalQuota(Long labId) {
        List<Lab> labs = labMapper.selectList(new LambdaQueryWrapper<Lab>()
                .eq(labId != null, Lab::getId, labId));
        return labs.stream().mapToInt(lab -> Optional.ofNullable(lab.getTotalQuota()).orElse(0)).sum();
    }

    /**
     * 计算名额饱和度百分比。
     *
     * @param admitted   录取人数
     * @param totalQuota 总名额
     * @return 饱和度
     */
    private BigDecimal calculateSaturation(int admitted, int totalQuota) {
        if (totalQuota <= 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return BigDecimal.valueOf(admitted)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(totalQuota), 2, RoundingMode.HALF_UP);
    }

    /**
     * 内存分页。
     *
     * @param rows     总览行
     * @param pageNum  页码
     * @param pageSize 每页条数
     * @return 分页结果
     */
    private PageResult<ResultRowVO> paginate(List<ResultRowVO> rows, long pageNum, long pageSize) {
        long safePage = Math.max(1, pageNum);
        long safeSize = pageSize < 1 ? 10 : Math.min(pageSize, 100);
        int from = (int) Math.min((safePage - 1) * safeSize, rows.size());
        int to = (int) Math.min(from + safeSize, rows.size());
        return new PageResult<>((long) rows.size(), safePage, safeSize,
                new ArrayList<>(rows.subList(from, to)));
    }

    /**
     * 空分页。
     *
     * @param pageNum  页码
     * @param pageSize 每页条数
     * @return 空分页
     */
    private PageResult<ResultRowVO> emptyPage(long pageNum, long pageSize) {
        return new PageResult<>(0L, Math.max(1, pageNum), pageSize < 1 ? 10 : Math.min(pageSize, 100),
                new ArrayList<>());
    }

    /**
     * 查询轮次，不存在时抛 404001。
     *
     * @param roundId 轮次 ID
     * @return 轮次
     */
    private SelectionRound requireRound(Long roundId) {
        SelectionRound round = selectionRoundMapper.selectById(roundId);
        if (round == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "选拔轮次不存在");
        }
        return round;
    }

    /**
     * 查询最近轮次。
     *
     * @return 轮次，可能为空
     */
    private SelectionRound latestRound() {
        return selectionRoundMapper.selectOne(new LambdaQueryWrapper<SelectionRound>()
                .orderByDesc(SelectionRound::getRoundNo)
                .last("LIMIT 1"));
    }

    /**
     * 查询当前最终归档快照。
     *
     * @param roundId 轮次 ID
     * @return 快照，可能为空
     */
    private RoundSnapshot currentFinalSnapshot(Long roundId) {
        return roundSnapshotMapper.selectOne(new LambdaQueryWrapper<RoundSnapshot>()
                .eq(RoundSnapshot::getRoundId, roundId)
                .eq(RoundSnapshot::getSnapshotType, SNAPSHOT_FINAL)
                .eq(RoundSnapshot::getIsCurrent, 1)
                .orderByDesc(RoundSnapshot::getVersion)
                .last("LIMIT 1"));
    }

    /**
     * 查询轮次最近一条公示。
     *
     * @param roundId 轮次 ID
     * @return 公示，可能为空
     */
    private Publicity latestPublicity(Long roundId) {
        return publicityMapper.selectOne(new LambdaQueryWrapper<Publicity>()
                .eq(Publicity::getRoundId, roundId)
                .orderByDesc(Publicity::getId)
                .last("LIMIT 1"));
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
     * 批量加载导师档案。
     *
     * @param mentorIds 导师档案 ID 列表
     * @return 导师映射
     */
    private Map<Long, MentorProfile> loadMentors(List<Long> mentorIds) {
        if (mentorIds.isEmpty()) {
            return new HashMap<>();
        }
        return mentorProfileMapper.selectBatchIds(mentorIds).stream()
                .collect(Collectors.toMap(MentorProfile::getId, Function.identity(),
                        (first, second) -> first));
    }

    /**
     * 写操作日志。
     *
     * @param operatorId 操作人
     * @param bizType    业务类型
     * @param bizId      业务主键
     * @param action     动作
     * @param before     变更前
     * @param after      变更后
     * @param reason     理由
     */
    private void writeLog(Long operatorId, String bizType, Long bizId, String action,
                          String before, String after, String reason) {
        SysUser operator = sysUserMapper.selectById(operatorId);
        OperationLog operationLog = new OperationLog();
        operationLog.setOperatorId(operatorId);
        operationLog.setOperatorName(operator == null ? "" : operator.getRealName());
        operationLog.setBizType(bizType);
        operationLog.setBizId(bizId);
        operationLog.setAction(action);
        operationLog.setBeforeValue(before);
        operationLog.setAfterValue(after);
        operationLog.setReason(reason);
        operationLogMapper.insert(operationLog);
    }
}
