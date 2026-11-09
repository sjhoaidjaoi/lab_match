package com.labmatch.module.application.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labmatch.common.BusinessException;
import com.labmatch.common.ResultCode;
import com.labmatch.module.application.dto.ApplicationSaveRequest;
import com.labmatch.module.application.dto.ApplicationView;
import com.labmatch.module.application.dto.IntentView;
import com.labmatch.module.application.entity.AdjustmentConsent;
import com.labmatch.module.application.entity.Intention;
import com.labmatch.module.application.entity.StudentApplication;
import com.labmatch.module.application.entity.SubmissionReceipt;
import com.labmatch.module.application.mapper.AdjustmentConsentMapper;
import com.labmatch.module.application.mapper.IntentionMapper;
import com.labmatch.module.application.mapper.StudentApplicationMapper;
import com.labmatch.module.application.mapper.SubmissionReceiptMapper;
import com.labmatch.module.base.dto.MentorView;
import com.labmatch.module.base.entity.Lab;
import com.labmatch.module.base.entity.Round;
import com.labmatch.module.base.mapper.LabMapper;
import com.labmatch.module.base.mapper.RoundMapper;
import com.labmatch.module.base.service.CatalogService;
import com.labmatch.security.UserContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;

/**
 * 意向填报（阶段三）参考实现，补录轮（阶段六）可复用同一套逻辑。
 * 待完善：名额校验、盲选规则、回执快照、幂等键。
 */
@Service
@RequiredArgsConstructor
public class ApplicationService {

    private static final int MAX_INTENTS = 3;

    private final StudentApplicationMapper applicationMapper;
    private final IntentionMapper intentionMapper;
    private final AdjustmentConsentMapper consentMapper;
    private final SubmissionReceiptMapper receiptMapper;
    private final RoundMapper roundMapper;
    private final LabMapper labMapper;
    private final CatalogService catalogService;

    public ApplicationView mine(Long cycleId, Integer roundNo) {
        Long studentId = UserContext.userId();
        StudentApplication application = find(cycleId, roundNo, studentId);
        Round round = findRound(cycleId, roundNo);
        if (application == null) {
            ApplicationView empty = new ApplicationView();
            empty.setCycleId(cycleId);
            empty.setRound(roundNo);
            empty.setStatus("DRAFT");
            empty.setIntents(List.of());
            empty.setAcceptL1(false);
            empty.setAcceptL2(false);
            empty.setEditable(isWindowOpen(round));
            empty.setApplyEnd(round == null ? null : round.getApplyEnd());
            return empty;
        }
        return toView(application, round);
    }

    @Transactional
    public ApplicationView save(ApplicationSaveRequest request) {
        Long studentId = UserContext.userId();
        Round round = requireOpenWindow(request.getCycleId(), request.getRound());
        List<Long> mentorIds = normalizeMentors(request.getMentorIds());

        StudentApplication application = find(request.getCycleId(), request.getRound(), studentId);
        if (application == null) {
            application = new StudentApplication();
            application.setCycleId(request.getCycleId());
            application.setRound(request.getRound());
            application.setStudentId(studentId);
            application.setStatus("DRAFT");
            applicationMapper.insert(application);
        } else if ("LOCKED".equals(application.getStatus())) {
            throw new BusinessException(ResultCode.STAGE_LOCKED, "本轮填报已锁定", HttpStatus.CONFLICT);
        } else {
            application.setStatus("DRAFT");
            applicationMapper.updateById(application);
        }

        intentionMapper.delete(new LambdaQueryWrapper<Intention>()
                .eq(Intention::getApplicationId, application.getId()));
        for (Long mentorId : mentorIds) {
            MentorView mentor = catalogService.mentors().stream()
                    .filter(m -> m.getId().equals(mentorId))
                    .findFirst()
                    .orElseThrow(() -> new BusinessException(ResultCode.VALIDATION_FAILED, "导师不存在：" + mentorId));
            Intention intent = new Intention();
            intent.setApplicationId(application.getId());
            intent.setMentorId(mentorId);
            intent.setLabId(mentor.getLabId());
            intent.setStatus("ACTIVE");
            intentionMapper.insert(intent);
        }

        saveConsent(application.getId(), "L1", Boolean.TRUE.equals(request.getAcceptL1()));
        saveConsent(application.getId(), "L2", Boolean.TRUE.equals(request.getAcceptL2()));
        return toView(application, round);
    }

    @Transactional
    public ApplicationView submit(ApplicationSaveRequest request) {
        ApplicationView saved = save(request);
        if (saved.getIntents() == null || saved.getIntents().isEmpty()) {
            throw new BusinessException(ResultCode.VALIDATION_FAILED, "至少选择 1 个意向");
        }
        StudentApplication application = applicationMapper.selectById(saved.getId());
        application.setStatus("SUBMITTED");
        application.setSubmittedAt(LocalDateTime.now());
        application.setReceiptNo("R" + request.getRound() + "-" + application.getStudentId() + "-"
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss")));
        applicationMapper.updateById(application);

        SubmissionReceipt receipt = new SubmissionReceipt();
        receipt.setApplicationId(application.getId());
        receipt.setReceiptNo(application.getReceiptNo());
        receipt.setContentSnapshot("{\"intents\":" + saved.getIntents().size() + "}");
        receipt.setSubmittedAt(LocalDateTime.now());
        receiptMapper.insert(receipt);

        return toView(application, findRound(request.getCycleId(), request.getRound()));
    }

    private List<Long> normalizeMentors(List<Long> mentorIds) {
        if (mentorIds == null) {
            return List.of();
        }
        List<Long> distinct = new ArrayList<>(new LinkedHashSet<>(mentorIds.stream().filter(Objects::nonNull).toList()));
        if (distinct.size() > MAX_INTENTS) {
            throw new BusinessException(ResultCode.VALIDATION_FAILED, "最多选择 " + MAX_INTENTS + " 个意向");
        }
        return distinct;
    }

    private void saveConsent(Long applicationId, String scopeCode, boolean accepted) {
        AdjustmentConsent consent = consentMapper.selectOne(new LambdaQueryWrapper<AdjustmentConsent>()
                .eq(AdjustmentConsent::getApplicationId, applicationId)
                .eq(AdjustmentConsent::getScopeCode, scopeCode)
                .last("LIMIT 1"));
        if (consent == null) {
            consent = new AdjustmentConsent();
            consent.setApplicationId(applicationId);
            consent.setScopeCode(scopeCode);
            consent.setAccepted(accepted);
            consent.setSnapshotAt(LocalDateTime.now());
            consentMapper.insert(consent);
        } else {
            consent.setAccepted(accepted);
            consent.setSnapshotAt(LocalDateTime.now());
            consentMapper.updateById(consent);
        }
    }

    private ApplicationView toView(StudentApplication application, Round round) {
        ApplicationView view = new ApplicationView();
        view.setId(application.getId());
        view.setCycleId(application.getCycleId());
        view.setRound(application.getRound());
        view.setStatus(application.getStatus());
        view.setSubmittedAt(application.getSubmittedAt());
        view.setReceiptNo(application.getReceiptNo());
        view.setApplyEnd(round == null ? null : round.getApplyEnd());
        view.setEditable(isWindowOpen(round) && !"LOCKED".equals(application.getStatus()));

        List<Intention> intents = intentionMapper.selectList(new LambdaQueryWrapper<Intention>()
                .eq(Intention::getApplicationId, application.getId())
                .orderByAsc(Intention::getId));
        List<MentorView> mentors = catalogService.mentors();
        List<IntentView> intentViews = intents.stream().map(intent -> {
            IntentView iv = new IntentView();
            iv.setMentorId(intent.getMentorId());
            MentorView mentor = mentors.stream()
                    .filter(m -> m.getId().equals(intent.getMentorId()))
                    .findFirst().orElse(null);
            if (mentor != null) {
                iv.setMentorName(mentor.getName());
                iv.setDirection(mentor.getDirection());
                iv.setAvailable(mentor.getAvailable());
            }
            iv.setLabId(intent.getLabId());
            Lab lab = labMapper.selectById(intent.getLabId());
            iv.setLabName(lab == null ? null : lab.getName());
            return iv;
        }).toList();
        view.setIntents(intentViews);

        List<AdjustmentConsent> consents = consentMapper.selectList(new LambdaQueryWrapper<AdjustmentConsent>()
                .eq(AdjustmentConsent::getApplicationId, application.getId()));
        view.setAcceptL1(consents.stream().anyMatch(c -> "L1".equals(c.getScopeCode()) && Boolean.TRUE.equals(c.getAccepted())));
        view.setAcceptL2(consents.stream().anyMatch(c -> "L2".equals(c.getScopeCode()) && Boolean.TRUE.equals(c.getAccepted())));
        return view;
    }

    private StudentApplication find(Long cycleId, Integer roundNo, Long studentId) {
        return applicationMapper.selectOne(new LambdaQueryWrapper<StudentApplication>()
                .eq(StudentApplication::getCycleId, cycleId)
                .eq(StudentApplication::getRound, roundNo)
                .eq(StudentApplication::getStudentId, studentId)
                .last("LIMIT 1"));
    }

    private Round findRound(Long cycleId, Integer roundNo) {
        return roundMapper.selectOne(new LambdaQueryWrapper<Round>()
                .eq(Round::getCycleId, cycleId)
                .eq(Round::getRoundNo, roundNo)
                .last("LIMIT 1"));
    }

    private Round requireOpenWindow(Long cycleId, Integer roundNo) {
        Round round = findRound(cycleId, roundNo);
        if (round == null) {
            throw new BusinessException(ResultCode.VALIDATION_FAILED, "轮次不存在");
        }
        LocalDateTime now = LocalDateTime.now();
        if (round.getApplyStart() != null && now.isBefore(round.getApplyStart())) {
            throw new BusinessException(ResultCode.WINDOW_NOT_OPEN, "填报尚未开始", HttpStatus.CONFLICT);
        }
        if (round.getApplyEnd() != null && now.isAfter(round.getApplyEnd())) {
            throw new BusinessException(ResultCode.WINDOW_CLOSED, "填报已截止", HttpStatus.CONFLICT);
        }
        return round;
    }

    private boolean isWindowOpen(Round round) {
        if (round == null) {
            return false;
        }
        LocalDateTime now = LocalDateTime.now();
        return (round.getApplyStart() == null || !now.isBefore(round.getApplyStart()))
                && (round.getApplyEnd() == null || !now.isAfter(round.getApplyEnd()));
    }
}
