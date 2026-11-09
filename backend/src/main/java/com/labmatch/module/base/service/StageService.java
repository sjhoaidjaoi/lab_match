package com.labmatch.module.base.service;

import com.labmatch.module.base.dto.StageView;
import com.labmatch.module.base.entity.Cycle;
import com.labmatch.module.base.entity.Round;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

/**
 * 阶段机：所有时间判断以服务端时间为准（设计文档 1.2 / 11.9）。
 */
@Service
public class StageService {

    private static final String[] NAMES = {
            "未开始", "集中宣讲", "实训室开放日", "意向填报",
            "导师初选与面试考核", "拟录取与学生确认", "分轮补录",
            "统筹调剂录取", "结果公示与正式入组"
    };

    public StageView compute(Cycle cycle, List<Round> rounds) {
        LocalDateTime now = LocalDateTime.now();
        if (cycle == null) {
            return new StageView(0, NAMES[0], "未开始", null, null, null);
        }
        if (cycle.getAnnounceAt() != null && now.isBefore(cycle.getAnnounceAt())) {
            return new StageView(0, NAMES[0], "未开始", cycle.getAnnounceAt(), cycle.getAnnounceAt(), null);
        }
        if (cycle.getOpenDayStart() != null && now.isBefore(cycle.getOpenDayStart())) {
            return new StageView(1, NAMES[1], "进行中", cycle.getAnnounceAt(), cycle.getOpenDayStart(), null);
        }
        if (cycle.getOpenDayEnd() != null && now.isBefore(cycle.getOpenDayEnd())) {
            return new StageView(2, NAMES[2], "进行中", cycle.getOpenDayStart(), cycle.getOpenDayEnd(), null);
        }

        List<Round> sorted = rounds.stream().sorted(Comparator.comparing(Round::getRoundNo)).toList();
        for (Round round : sorted) {
            if (round.getApplyStart() != null && now.isBefore(round.getApplyStart())) {
                int stage = round.getRoundNo() == 1 ? 3 : 6;
                return new StageView(stage, NAMES[stage], "未开始", round.getApplyStart(), round.getApplyStart(), round.getRoundNo());
            }
            if (round.getApplyEnd() != null && !now.isAfter(round.getApplyEnd())) {
                int stage = round.getRoundNo() == 1 ? 3 : 6;
                return new StageView(stage, NAMES[stage], "进行中", round.getApplyStart(), round.getApplyEnd(), round.getRoundNo());
            }
            if (round.getInterviewEnd() != null && !now.isAfter(round.getInterviewEnd())) {
                return new StageView(4, NAMES[4], "进行中", round.getInterviewStart(), round.getInterviewEnd(), round.getRoundNo());
            }
            if (round.getConfirmEnd() != null && !now.isAfter(round.getConfirmEnd())) {
                return new StageView(5, NAMES[5], "进行中", round.getConfirmStart(), round.getConfirmEnd(), round.getRoundNo());
            }
        }

        if (cycle.getAdjustStart() != null && now.isBefore(cycle.getAdjustStart())) {
            return new StageView(7, NAMES[7], "未开始", cycle.getAdjustStart(), cycle.getAdjustEnd(), null);
        }
        if (cycle.getAdjustEnd() != null && !now.isAfter(cycle.getAdjustEnd())) {
            return new StageView(7, NAMES[7], "进行中", cycle.getAdjustStart(), cycle.getAdjustEnd(), null);
        }
        if (cycle.getPublicityStart() != null && now.isBefore(cycle.getPublicityStart())) {
            return new StageView(8, NAMES[8], "未开始", cycle.getPublicityStart(), cycle.getPublicityEnd(), null);
        }
        if (cycle.getPublicityEnd() != null && !now.isAfter(cycle.getPublicityEnd())) {
            return new StageView(8, NAMES[8], "进行中", cycle.getPublicityStart(), cycle.getPublicityEnd(), null);
        }
        return new StageView(8, NAMES[8], "已结束", cycle.getPublicityStart(), cycle.getPublicityEnd(), null);
    }

    public static String nameOf(int stage) {
        return stage >= 0 && stage < NAMES.length ? NAMES[stage] : "未知";
    }
}
