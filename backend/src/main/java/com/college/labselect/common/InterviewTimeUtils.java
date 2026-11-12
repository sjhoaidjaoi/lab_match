package com.college.labselect.common;

import com.college.labselect.entity.InterviewSession;

import java.util.Objects;

/**
 * 面试时段工具。
 */
public final class InterviewTimeUtils {

    private InterviewTimeUtils() {
    }

    /**
     * 判断两个面试场次时段是否重叠。
     *
     * @param first  场次一
     * @param second 场次二
     * @return 是否重叠
     */
    public static boolean overlap(InterviewSession first, InterviewSession second) {
        if (!Objects.equals(first.getInterviewDate(), second.getInterviewDate())
                || first.getStartTime() == null || first.getEndTime() == null
                || second.getStartTime() == null || second.getEndTime() == null) {
            return false;
        }
        return first.getStartTime().isBefore(second.getEndTime())
                && second.getStartTime().isBefore(first.getEndTime());
    }
}
