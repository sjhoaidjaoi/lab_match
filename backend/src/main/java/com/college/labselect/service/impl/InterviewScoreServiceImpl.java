package com.college.labselect.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.college.labselect.common.DesensitizeUtils;
import com.college.labselect.common.PageResult;
import com.college.labselect.common.ResultCode;
import com.college.labselect.common.StatusTextUtils;
import com.college.labselect.dto.req.InterviewScoreSaveReqDTO;
import com.college.labselect.dto.resp.InterviewScoreListVO;
import com.college.labselect.dto.resp.InterviewScoreRespVO;
import com.college.labselect.dto.resp.ScoreImportFailVO;
import com.college.labselect.dto.resp.ScoreImportResultVO;
import com.college.labselect.dto.resp.TeacherScoreDetailVO;
import com.college.labselect.entity.InterviewScore;
import com.college.labselect.entity.InterviewSchedule;
import com.college.labselect.entity.InterviewSession;
import com.college.labselect.entity.Lab;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.OperationLog;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.entity.SysUser;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.InterviewScheduleMapper;
import com.college.labselect.mapper.InterviewScoreMapper;
import com.college.labselect.mapper.InterviewSessionMapper;
import com.college.labselect.mapper.LabMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.OperationLogMapper;
import com.college.labselect.mapper.SelectionRoundMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.service.IInterviewScoreService;
import com.college.labselect.utils.InterviewScoreExcelParser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 面试评分服务实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InterviewScoreServiceImpl implements IInterviewScoreService {

    private static final int SCORE_DRAFT = 1;
    private static final int SCORE_SUBMITTED = 2;
    private static final int SUBMIT_FLAG = 1;
    private static final int USER_TYPE_STUDENT = 1;
    private static final int ROUND_INTERVIEWING = 3;
    private static final int LOCKED = 1;
    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final BigDecimal DEFAULT_WEIGHT = new BigDecimal("25.00");

    private final InterviewScoreMapper interviewScoreMapper;
    private final InterviewScheduleMapper interviewScheduleMapper;
    private final InterviewSessionMapper interviewSessionMapper;
    private final SelectionRoundMapper selectionRoundMapper;
    private final SysUserMapper sysUserMapper;
    private final LabMapper labMapper;
    private final MentorProfileMapper mentorProfileMapper;
    private final OperationLogMapper operationLogMapper;
    private final InterviewScoreExcelParser scoreExcelParser;

    @Override
    public PageResult<InterviewScoreListVO> pageScores(Long leaderUserId, Long roundId, String keyword,
                                                       Integer status, long pageNum, long pageSize) {
        long safePage = Math.max(1, pageNum);
        long safeSize = pageSize < 1 ? 10 : Math.min(pageSize, 100);
        Lab lab = requireLab(leaderUserId);
        Long targetRoundId = roundId == null ? currentRoundId() : roundId;
        if (targetRoundId == null) {
            return new PageResult<>(0L, safePage, safeSize, List.of());
        }
        List<InterviewSchedule> schedules = interviewScheduleMapper.selectList(
                new LambdaQueryWrapper<InterviewSchedule>()
                        .eq(InterviewSchedule::getRoundId, targetRoundId)
                        .eq(InterviewSchedule::getLabId, lab.getId())
                        .orderByAsc(InterviewSchedule::getId));
        if (schedules.isEmpty()) {
            return new PageResult<>(0L, safePage, safeSize, List.of());
        }
        Map<Long, InterviewScore> scoreMap = interviewScoreMapper.selectList(
                        new LambdaQueryWrapper<InterviewScore>()
                                .eq(InterviewScore::getRoundId, targetRoundId)
                                .eq(InterviewScore::getLabId, lab.getId()))
                .stream()
                .collect(Collectors.toMap(InterviewScore::getStudentId, Function.identity(),
                        (first, second) -> first));
        Map<Long, SysUser> studentMap = loadUsers(schedules.stream()
                .map(InterviewSchedule::getStudentId).distinct().toList());
        Map<Long, InterviewSession> sessionMap = loadSessions(schedules.stream()
                .map(InterviewSchedule::getSessionId).distinct().toList());
        String text = StrUtil.trim(keyword);
        List<InterviewScoreListVO> all = new ArrayList<>();
        for (InterviewSchedule schedule : schedules) {
            SysUser student = studentMap.get(schedule.getStudentId());
            InterviewScore score = scoreMap.get(schedule.getStudentId());
            int scoreStatus = score == null ? 0 : Optional.ofNullable(score.getStatus()).orElse(0);
            if (status != null && !Objects.equals(status, scoreStatus)) {
                continue;
            }
            if (StrUtil.isNotBlank(text)
                    && !StrUtil.containsIgnoreCase(student == null ? "" : student.getUserNo(), text)
                    && !StrUtil.containsIgnoreCase(student == null ? "" : student.getRealName(), text)) {
                continue;
            }
            InterviewSession session = sessionMap.get(schedule.getSessionId());
            InterviewScoreListVO vo = new InterviewScoreListVO();
            vo.setId(score == null ? null : score.getId());
            vo.setStudentId(schedule.getStudentId());
            vo.setStudentNo(student == null ? "" : DesensitizeUtils.maskUserNo(student.getUserNo()));
            vo.setStudentName(student == null ? "" : DesensitizeUtils.maskName(student.getRealName()));
            vo.setSessionId(schedule.getSessionId());
            vo.setSessionName(session == null ? "" : session.getSessionName());
            if (score != null) {
                vo.setAttitudeScore(score.getAttitudeScore());
                vo.setLogicScore(score.getLogicScore());
                vo.setProgrammingScore(score.getProgrammingScore());
                vo.setTimeScore(score.getTimeScore());
                vo.setSystemTotal(score.getSystemTotal());
                vo.setManualTotal(score.getManualTotal());
                vo.setFinalTotal(score.getFinalTotal());
            }
            vo.setStatus(scoreStatus);
            vo.setStatusText(score == null ? "未评分"
                    : StatusTextUtils.interviewScoreStatus(score.getStatus()));
            all.add(vo);
        }
        all.sort(Comparator.comparing(InterviewScoreListVO::getStudentNo,
                Comparator.nullsLast(Comparator.naturalOrder())));
        int from = (int) Math.min((safePage - 1) * safeSize, all.size());
        int to = (int) Math.min(from + safeSize, all.size());
        return new PageResult<>((long) all.size(), safePage, safeSize, new ArrayList<>(all.subList(from, to)));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public InterviewScoreRespVO saveScore(Long leaderUserId, InterviewScoreSaveReqDTO req) {
        Lab lab = requireLab(leaderUserId);
        return doSaveScore(leaderUserId, lab, req);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ScoreImportResultVO importScores(Long leaderUserId, MultipartFile file) {
        Lab lab = requireLab(leaderUserId);
        SelectionRound round = currentRound();
        if (round == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "当前无选拔轮次");
        }
        ensureScoreWritable(round);
        List<InterviewScoreExcelParser.Row> rows = scoreExcelParser.parse(file);
        if (rows.isEmpty()) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "Excel 无有效数据");
        }
        int success = 0;
        List<ScoreImportFailVO> failList = new ArrayList<>();
        for (InterviewScoreExcelParser.Row row : rows) {
            try {
                SysUser student = sysUserMapper.selectOne(new LambdaQueryWrapper<SysUser>()
                        .eq(SysUser::getUserNo, StrUtil.trim(row.getUserNo())));
                if (student == null || !Integer.valueOf(USER_TYPE_STUDENT).equals(student.getUserType())) {
                    log.warn("评分导入跳过，学号不存在，row={}，userNo={}", row.getRowNo(), row.getUserNo());
                    failList.add(new ScoreImportFailVO(row.getRowNo(), row.getUserNo(), "学号不存在或不是学生账号"));
                    continue;
                }
                InterviewScoreSaveReqDTO req = new InterviewScoreSaveReqDTO();
                req.setRoundId(round.getId());
                req.setStudentId(student.getId());
                req.setAttitudeScore(row.getAttitudeScore());
                req.setLogicScore(row.getLogicScore());
                req.setProgrammingScore(row.getProgrammingScore());
                req.setTimeScore(row.getTimeScore());
                req.setComment(row.getComment());
                req.setSubmit(SUBMIT_FLAG);
                doSaveScore(leaderUserId, lab, req);
                success++;
            } catch (BusinessException exception) {
                log.warn("评分导入跳过，row={}，userNo={}，reason={}",
                        row.getRowNo(), row.getUserNo(), exception.getMessage());
                failList.add(new ScoreImportFailVO(row.getRowNo(), row.getUserNo(), exception.getMessage()));
            }
        }
        log.info("批量导入面试评分，labId={}，total={}，success={}，fail={}",
                lab.getId(), rows.size(), success, failList.size());
        ScoreImportResultVO result = new ScoreImportResultVO();
        result.setTotalCount(rows.size());
        result.setSuccessCount(success);
        result.setFailCount(failList.size());
        result.setFailList(failList);
        return result;
    }

    @Override
    public TeacherScoreDetailVO getTeacherScore(Long teacherUserId, Long studentId, Long roundId) {
        MentorProfile mentor = mentorProfileMapper.selectOne(new LambdaQueryWrapper<MentorProfile>()
                .eq(MentorProfile::getUserId, teacherUserId));
        if (mentor == null) {
            throw new BusinessException(ResultCode.FORBIDDEN, "无权查看该学生评分");
        }
        Long targetRoundId = roundId == null ? currentRoundId() : roundId;
        if (targetRoundId == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "当前无选拔轮次");
        }
        InterviewScore score = interviewScoreMapper.selectOne(new LambdaQueryWrapper<InterviewScore>()
                .eq(InterviewScore::getRoundId, targetRoundId)
                .eq(InterviewScore::getLabId, mentor.getLabId())
                .eq(InterviewScore::getStudentId, studentId));
        if (score == null) {
            throw new BusinessException(ResultCode.FORBIDDEN, "无权查看该学生评分");
        }
        SysUser student = sysUserMapper.selectById(studentId);
        TeacherScoreDetailVO vo = new TeacherScoreDetailVO();
        vo.setId(score.getId());
        vo.setStudentId(score.getStudentId());
        vo.setStudentNo(student == null ? "" : DesensitizeUtils.maskUserNo(student.getUserNo()));
        vo.setStudentName(student == null ? "" : DesensitizeUtils.maskName(student.getRealName()));
        vo.setAttitudeScore(score.getAttitudeScore());
        vo.setLogicScore(score.getLogicScore());
        vo.setProgrammingScore(score.getProgrammingScore());
        vo.setTimeScore(score.getTimeScore());
        vo.setSystemTotal(score.getSystemTotal());
        vo.setManualTotal(score.getManualTotal());
        vo.setFinalTotal(score.getFinalTotal());
        vo.setAdjustReason(score.getAdjustReason());
        vo.setComment(score.getComment());
        vo.setStatus(score.getStatus());
        return vo;
    }

    /**
     * 执行评分计算与持久化。
     *
     * @param leaderUserId 负责人用户 ID
     * @param lab          实训室
     * @param req          评分请求
     * @return 评分结果
     */
    private InterviewScoreRespVO doSaveScore(Long leaderUserId, Lab lab, InterviewScoreSaveReqDTO req) {
        validateScores(req);
        InterviewSchedule schedule = interviewScheduleMapper.selectOne(new LambdaQueryWrapper<InterviewSchedule>()
                .eq(InterviewSchedule::getRoundId, req.getRoundId())
                .eq(InterviewSchedule::getLabId, lab.getId())
                .eq(InterviewSchedule::getStudentId, req.getStudentId()));
        if (schedule == null) {
            throw new BusinessException(ResultCode.FORBIDDEN, "该学生未在本室面试");
        }
        SelectionRound round = selectionRoundMapper.selectById(req.getRoundId());
        if (round == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "选拔轮次不存在");
        }
        ensureScoreWritable(round);
        BigDecimal systemTotal = calculateTotal(round, req);
        BigDecimal manualTotal = req.getManualTotal() == null
                ? null : req.getManualTotal().setScale(2, RoundingMode.HALF_UP);
        BigDecimal finalTotal = manualTotal == null ? systemTotal : manualTotal;
        InterviewScore existing = interviewScoreMapper.selectOne(new LambdaQueryWrapper<InterviewScore>()
                .eq(InterviewScore::getRoundId, req.getRoundId())
                .eq(InterviewScore::getLabId, lab.getId())
                .eq(InterviewScore::getStudentId, req.getStudentId()));
        BigDecimal beforeTotal = existing == null || existing.getFinalTotal() == null
                ? systemTotal : existing.getFinalTotal();
        InterviewScore score = existing == null ? new InterviewScore() : existing;
        score.setRoundId(req.getRoundId());
        score.setLabId(lab.getId());
        score.setStudentId(req.getStudentId());
        score.setSessionId(schedule.getSessionId());
        score.setAttitudeScore(req.getAttitudeScore());
        score.setLogicScore(req.getLogicScore());
        score.setProgrammingScore(req.getProgrammingScore());
        score.setTimeScore(req.getTimeScore());
        score.setSystemTotal(systemTotal);
        score.setManualTotal(manualTotal);
        score.setFinalTotal(finalTotal);
        score.setAdjustReason(manualTotal == null ? null : req.getAdjustReason());
        score.setComment(req.getComment());
        score.setScorerId(leaderUserId);
        score.setStatus(Integer.valueOf(SUBMIT_FLAG).equals(req.getSubmit()) ? SCORE_SUBMITTED : SCORE_DRAFT);
        if (existing == null) {
            interviewScoreMapper.insert(score);
        } else {
            interviewScoreMapper.updateById(score);
        }
        if (manualTotal != null) {
            writeManualLog(leaderUserId, score.getId(), beforeTotal, finalTotal, req.getAdjustReason());
        }
        InterviewScoreRespVO resp = new InterviewScoreRespVO();
        resp.setId(score.getId());
        resp.setSystemTotal(systemTotal);
        resp.setManualTotal(manualTotal);
        resp.setFinalTotal(finalTotal);
        resp.setStatus(score.getStatus());
        return resp;
    }

    /**
     * 校验四维分数与手动覆写参数。
     *
     * @param req 评分请求
     */
    private void validateScores(InterviewScoreSaveReqDTO req) {
        checkScore(req.getAttitudeScore());
        checkScore(req.getLogicScore());
        checkScore(req.getProgrammingScore());
        checkScore(req.getTimeScore());
        if (req.getManualTotal() != null) {
            checkScore(req.getManualTotal());
            if (StrUtil.isBlank(req.getAdjustReason())) {
                throw new BusinessException(ResultCode.PARAM_ERROR, "手动调整总分时必须填写理由");
            }
        }
    }

    /**
     * 校验单个分数在 0-100 之间。
     *
     * @param score 分数
     */
    private void checkScore(BigDecimal score) {
        if (score == null || score.compareTo(BigDecimal.ZERO) < 0 || score.compareTo(HUNDRED) > 0) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "分数必须在 0-100 之间");
        }
    }

    /**
     * 校验评分写操作的批次锁定、轮次阶段与面试时间窗。
     *
     * @param round 选拔轮次
     */
    private void ensureScoreWritable(SelectionRound round) {
        if (Integer.valueOf(LOCKED).equals(round.getLocked())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "批次已锁定，不可录入评分");
        }
        if (!Integer.valueOf(ROUND_INTERVIEWING).equals(round.getStatus())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "当前不在面试阶段");
        }
        LocalDateTime now = LocalDateTime.now();
        if (round.getInterviewStart() == null || round.getInterviewEnd() == null
                || now.isBefore(round.getInterviewStart()) || now.isAfter(round.getInterviewEnd())) {
            throw new BusinessException(ResultCode.OUT_OF_TIME_WINDOW, "当前不在面试时间窗内");
        }
    }

    /**
     * 按轮次权重计算系统总分。
     *
     * @param round 选拔轮次
     * @param req   评分请求
     * @return 系统总分
     */
    private BigDecimal calculateTotal(SelectionRound round, InterviewScoreSaveReqDTO req) {
        BigDecimal weighted = req.getAttitudeScore().multiply(weight(round.getWeightAttitude()))
                .add(req.getLogicScore().multiply(weight(round.getWeightLogic())))
                .add(req.getProgrammingScore().multiply(weight(round.getWeightProgramming())))
                .add(req.getTimeScore().multiply(weight(round.getWeightTime())));
        return weighted.divide(HUNDRED, 2, RoundingMode.HALF_UP);
    }

    /**
     * 取权重，空值按 25% 处理。
     *
     * @param weight 权重
     * @return 权重
     */
    private BigDecimal weight(BigDecimal weight) {
        return weight == null ? DEFAULT_WEIGHT : weight;
    }

    /**
     * 写入手动覆写总分操作日志。
     *
     * @param operatorId 操作人 ID
     * @param scoreId    评分 ID
     * @param before     变更前总分
     * @param after      变更后总分
     * @param reason     调整理由
     */
    private void writeManualLog(Long operatorId, Long scoreId, BigDecimal before,
                                BigDecimal after, String reason) {
        SysUser operator = sysUserMapper.selectById(operatorId);
        OperationLog operationLog = new OperationLog();
        operationLog.setOperatorId(operatorId);
        operationLog.setOperatorName(operator == null ? "" : operator.getRealName());
        operationLog.setBizType("SCORE");
        operationLog.setBizId(scoreId);
        operationLog.setAction("手动覆写总分");
        operationLog.setBeforeValue(before == null ? null : before.toPlainString());
        operationLog.setAfterValue(after == null ? null : after.toPlainString());
        operationLog.setReason(reason);
        operationLogMapper.insert(operationLog);
    }

    /**
     * 查询负责人所在实训室。
     *
     * @param leaderUserId 负责人用户 ID
     * @return 实训室
     */
    private Lab requireLab(Long leaderUserId) {
        Lab lab = labMapper.selectOne(new LambdaQueryWrapper<Lab>().eq(Lab::getLeaderId, leaderUserId));
        if (lab == null) {
            throw new BusinessException(ResultCode.FORBIDDEN, "仅实训室负责人可录入评分");
        }
        return lab;
    }

    /**
     * 查询最近轮次。
     *
     * @return 选拔轮次，可能为空
     */
    private SelectionRound currentRound() {
        return selectionRoundMapper.selectOne(new LambdaQueryWrapper<SelectionRound>()
                .orderByDesc(SelectionRound::getRoundNo)
                .last("LIMIT 1"));
    }

    /**
     * 查询最近轮次 ID。
     *
     * @return 轮次 ID，可能为空
     */
    private Long currentRoundId() {
        SelectionRound round = currentRound();
        return round == null ? null : round.getId();
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
     * 批量加载面试场次。
     *
     * @param sessionIds 场次 ID 列表
     * @return 场次映射
     */
    private Map<Long, InterviewSession> loadSessions(List<Long> sessionIds) {
        if (sessionIds.isEmpty()) {
            return new HashMap<>();
        }
        return interviewSessionMapper.selectBatchIds(sessionIds).stream()
                .collect(Collectors.toMap(InterviewSession::getId, Function.identity(), (first, second) -> first));
    }
}
