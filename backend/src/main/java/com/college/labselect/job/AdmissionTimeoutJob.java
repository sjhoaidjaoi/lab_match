package com.college.labselect.job;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.college.labselect.entity.Admission;
import com.college.labselect.mapper.AdmissionMapper;
import com.college.labselect.service.impl.AdmissionWaitlistSupport;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 录取确认逾期扫描任务，每分钟将超过确认截止的待确认记录置为逾期。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdmissionTimeoutJob {

    private static final int STATUS_PENDING = 1;

    private final AdmissionMapper admissionMapper;
    private final AdmissionWaitlistSupport waitlistSupport;

    /**
     * 扫描并处理逾期的待确认录取记录。
     */
    @Scheduled(cron = "0 * * * * ?")
    public void scanTimeoutAdmissions() {
        LocalDateTime now = LocalDateTime.now();
        List<Admission> expired = admissionMapper.selectList(new LambdaQueryWrapper<Admission>()
                .eq(Admission::getStatus, STATUS_PENDING)
                .isNotNull(Admission::getConfirmDeadline)
                .lt(Admission::getConfirmDeadline, now));
        if (expired.isEmpty()) {
            return;
        }
        int handled = 0;
        for (Admission admission : expired) {
            try {
                if (waitlistSupport.expireIfPending(admission.getId(), now)) {
                    handled++;
                }
            } catch (Exception exception) {
                log.error("录取逾期处理失败，admissionId={}", admission.getId(), exception);
            }
        }
        if (handled > 0) {
            log.info("录取逾期扫描完成，共处理 {} 条待确认记录", handled);
        }
    }
}
