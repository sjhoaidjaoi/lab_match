package com.college.labselect.job;

import com.college.labselect.service.IExamAnswerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 在线笔试超时扫描任务，每分钟自动提交超时答卷并判分。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ExamTimeoutJob {

    private final IExamAnswerService examAnswerService;

    /**
     * 扫描并自动提交超时答卷。
     */
    @Scheduled(cron = "30 * * * * ?")
    public void scanTimeoutAnswers() {
        try {
            examAnswerService.autoSubmitExpired();
        } catch (Exception exception) {
            log.error("在线笔试超时扫描失败", exception);
        }
    }
}
