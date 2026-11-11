package com.college.labselect.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.college.labselect.entity.Admission;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.entity.Waitlist;
import com.college.labselect.mapper.AdmissionMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.SelectionRoundMapper;
import com.college.labselect.mapper.WaitlistMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 录取名额释放与递补级联支撑。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdmissionWaitlistSupport {

    private static final int STATUS_PENDING = 1;
    private static final int STATUS_CONFIRMED = 2;
    private static final int STATUS_ENROLLED = 3;
    private static final int PENDING_WAITLIST = 2;
    private static final int SOURCE_WAITLIST = 2;
    private static final int WAITLIST_PENDING = 1;
    private static final int WAITLIST_FILLED = 2;

    private final AdmissionMapper admissionMapper;
    private final WaitlistMapper waitlistMapper;
    private final MentorProfileMapper mentorProfileMapper;
    private final SelectionRoundMapper selectionRoundMapper;

    /**
     * 条件释放一个名额。
     *
     * @param mentorId 导师档案 ID
     */
    public void releaseQuota(Long mentorId) {
        if (mentorId == null) {
            return;
        }
        int updated = mentorProfileMapper.decreaseQuotaUsed(mentorId, 1);
        if (updated == 0) {
            log.warn("释放名额未命中，mentorId={}", mentorId);
        }
    }

    /**
     * 按顺位触发递补，找到首位可录取学生后生成待确认记录。
     *
     * @param roundId  轮次 ID
     * @param mentorId 导师档案 ID
     */
    public void triggerWaitlist(Long roundId, Long mentorId) {
        if (roundId == null || mentorId == null) {
            return;
        }
        SelectionRound round = selectionRoundMapper.selectById(roundId);
        MentorProfile mentor = mentorProfileMapper.selectById(mentorId);
        if (round == null || mentor == null) {
            return;
        }
        List<Waitlist> candidates = waitlistMapper.selectList(new LambdaQueryWrapper<Waitlist>()
                .eq(Waitlist::getRoundId, roundId)
                .eq(Waitlist::getMentorId, mentorId)
                .eq(Waitlist::getApplyStatus, WAITLIST_PENDING)
                .orderByAsc(Waitlist::getRankNo));
        for (Waitlist candidate : candidates) {
            long occupied = admissionMapper.selectCount(new LambdaQueryWrapper<Admission>()
                    .eq(Admission::getRoundId, roundId)
                    .eq(Admission::getStudentId, candidate.getStudentId())
                    .in(Admission::getStatus, STATUS_PENDING, STATUS_CONFIRMED, STATUS_ENROLLED));
            if (occupied > 0) {
                continue;
            }
            if (mentorProfileMapper.increaseQuotaUsed(mentorId, 1) == 0) {
                return;
            }
            Admission admission = new Admission();
            admission.setRoundId(roundId);
            admission.setStudentId(candidate.getStudentId());
            admission.setLabId(mentor.getLabId());
            admission.setMentorId(mentorId);
            admission.setSourceType(SOURCE_WAITLIST);
            admission.setPendingType(PENDING_WAITLIST);
            admission.setWaitlistId(candidate.getId());
            admission.setStatus(STATUS_PENDING);
            admission.setConfirmDeadline(waitlistDeadline(round));
            admissionMapper.insert(admission);
            Waitlist update = new Waitlist();
            update.setId(candidate.getId());
            update.setApplyStatus(WAITLIST_FILLED);
            waitlistMapper.updateById(update);
            log.info("递补待确认已生成，roundId={}，mentorId={}，studentId={}",
                    roundId, mentorId, candidate.getStudentId());
            return;
        }
    }

    /**
     * 递补确认截止 = max(确认截止时间, 当前时间 + 30 分钟)。
     *
     * @param round 选拔轮次
     * @return 确认截止时间
     */
    private LocalDateTime waitlistDeadline(SelectionRound round) {
        LocalDateTime fallback = LocalDateTime.now().plusMinutes(30);
        LocalDateTime nominationEnd = round.getNominationEnd();
        return nominationEnd != null && nominationEnd.isAfter(fallback) ? nominationEnd : fallback;
    }
}
