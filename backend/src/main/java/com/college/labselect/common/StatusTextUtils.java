package com.college.labselect.common;

/**
 * 业务状态文案映射，保证文本与状态值同源。
 */
public final class StatusTextUtils {

    private StatusTextUtils() {
    }

    /**
     * 公告类型文案。
     *
     * @param noticeType 1 宣讲 2 开放日 3 公示 4 通知
     * @return 类型文案
     */
    public static String noticeType(Integer noticeType) {
        if (noticeType == null) {
            return "";
        }
        return switch (noticeType) {
            case 1 -> "宣讲";
            case 2 -> "开放日";
            case 3 -> "公示";
            case 4 -> "通知";
            default -> "";
        };
    }

    /**
     * 公告状态文案。
     *
     * @param status 1 草稿 2 已发布 3 已下线
     * @return 状态文案
     */
    public static String noticeStatus(Integer status) {
        if (status == null) {
            return "";
        }
        return switch (status) {
            case 1 -> "草稿";
            case 2 -> "已发布";
            case 3 -> "已下线";
            default -> "";
        };
    }

    /**
     * 站内通知类型文案。
     *
     * @param noticeType 1 系统 2 填报 3 面试 4 确认 5 公示 6 异议
     * @return 类型文案
     */
    public static String userNoticeType(Integer noticeType) {
        if (noticeType == null) {
            return "";
        }
        return switch (noticeType) {
            case 1 -> "系统";
            case 2 -> "填报";
            case 3 -> "面试";
            case 4 -> "确认";
            case 5 -> "公示";
            case 6 -> "异议";
            default -> "";
        };
    }

    /**
     * 公示状态文案。
     *
     * @param status 1 公示中 2 已结束 3 已确认
     * @return 状态文案
     */
    public static String publicityStatus(Integer status) {
        if (status == null) {
            return "";
        }
        return switch (status) {
            case 1 -> "公示中";
            case 2 -> "已结束";
            case 3 -> "已确认";
            default -> "";
        };
    }

    /**
     * 异议状态文案。
     *
     * @param status 1 待处理 2 处理中 3 已处理
     * @return 状态文案
     */
    public static String disputeStatus(Integer status) {
        if (status == null) {
            return "";
        }
        return switch (status) {
            case 1 -> "待处理";
            case 2 -> "处理中";
            case 3 -> "已处理";
            default -> "";
        };
    }

    /**
     * 异议类型文案。
     *
     * @param type 1 录取结果有误 2 名额分配不公 3 信息登记错误 4 其他
     * @return 类型文案
     */
    public static String disputeType(Integer type) {
        if (type == null) {
            return "";
        }
        return switch (type) {
            case 1 -> "录取结果有误";
            case 2 -> "名额分配不公";
            case 3 -> "信息登记错误";
            case 4 -> "其他";
            default -> "";
        };
    }

    /**
     * 异议处理结果文案。
     *
     * @param result 1 维持原结果 2 调整录取 3 退回重审
     * @return 处理结果文案
     */
    public static String disputeHandleResult(Integer result) {
        if (result == null) {
            return "";
        }
        return switch (result) {
            case 1 -> "维持原结果";
            case 2 -> "调整录取";
            case 3 -> "退回重审";
            default -> "";
        };
    }

    /**
     * 轮次状态文案。
     *
     * @param status 1 未开始 2 填报中 3 面试中 4 拟录取确认中 5 已完成
     * @return 状态文案
     */
    public static String roundStatus(Integer status) {
        if (status == null) {
            return "";
        }
        return switch (status) {
            case 1 -> "未开始";
            case 2 -> "填报中";
            case 3 -> "面试中";
            case 4 -> "拟录取确认中";
            case 5 -> "已完成";
            default -> "";
        };
    }

    /**
     * 面试场次状态文案。
     *
     * @param status 1 草稿 2 已发布 3 已结束
     * @return 状态文案
     */
    public static String interviewSessionStatus(Integer status) {
        if (status == null) {
            return "";
        }
        return switch (status) {
            case 1 -> "草稿";
            case 2 -> "已发布";
            case 3 -> "已结束";
            default -> "";
        };
    }

    /**
     * 面试排期状态文案。
     *
     * @param status 1 待面试 2 已完成 3 缺席
     * @return 状态文案
     */
    public static String interviewScheduleStatus(Integer status) {
        if (status == null) {
            return "";
        }
        return switch (status) {
            case 1 -> "待面试";
            case 2 -> "已完成";
            case 3 -> "缺席";
            default -> "";
        };
    }

    /**
     * 面试评分状态文案。
     *
     * @param status 1 草稿 2 已提交
     * @return 状态文案
     */
    public static String interviewScoreStatus(Integer status) {
        if (status == null) {
            return "";
        }
        return switch (status) {
            case 1 -> "草稿";
            case 2 -> "已提交";
            default -> "";
        };
    }

    /**
     * 意向填报状态文案。
     *
     * @param status 1 草稿 2 已提交
     * @return 状态文案
     */
    public static String intentionStatus(Integer status) {
        if (status == null) {
            return "";
        }
        return switch (status) {
            case 1 -> "草稿";
            case 2 -> "已提交";
            default -> "";
        };
    }

    /**
     * 拟录取状态文案。
     *
     * @param status 1 草稿 2 已提交 3 已作废
     * @return 状态文案
     */
    public static String nominationStatus(Integer status) {
        if (status == null) {
            return "";
        }
        return switch (status) {
            case 1 -> "草稿";
            case 2 -> "已提交";
            case 3 -> "已作废";
            default -> "";
        };
    }

    /**
     * 递补申请状态文案。
     *
     * @param applyStatus 1 待递补 2 已递补 3 已失效
     * @return 状态文案
     */
    public static String waitlistApplyStatus(Integer applyStatus) {
        if (applyStatus == null) {
            return "";
        }
        return switch (applyStatus) {
            case 1 -> "待递补";
            case 2 -> "已递补";
            case 3 -> "已失效";
            default -> "";
        };
    }

    /**
     * 导师名单提交状态文案。
     *
     * @param submitStatus 0 未提交 1 草稿 2 已提交
     * @return 状态文案
     */
    public static String leaderSubmitStatus(Integer submitStatus) {
        if (submitStatus == null) {
            return "";
        }
        return switch (submitStatus) {
            case 1 -> "待提交";
            case 2 -> "已提交";
            default -> "未提交";
        };
    }

    /**
     * 录取状态文案。
     *
     * @param status 1 待确认 2 已确认 3 已入组 4 已放弃 5 逾期未确认
     * @return 状态文案
     */
    public static String admissionStatus(Integer status) {
        if (status == null) {
            return "";
        }
        return switch (status) {
            case 1 -> "待确认";
            case 2 -> "已确认";
            case 3 -> "已入组";
            case 4 -> "已放弃";
            case 5 -> "逾期未确认";
            default -> "";
        };
    }

    /**
     * 快照类型文案。
     *
     * @param snapshotType 1 拟录取 2 确认结果 3 调剂结果 4 最终归档
     * @return 类型文案
     */
    public static String snapshotType(Integer snapshotType) {
        if (snapshotType == null) {
            return "";
        }
        return switch (snapshotType) {
            case 1 -> "拟录取";
            case 2 -> "确认结果";
            case 3 -> "调剂结果";
            case 4 -> "最终归档";
            default -> "";
        };
    }

    /**
     * 待确认类型文案。
     *
     * @param pendingType 1 拟录取多选一 2 递补待确认 3 异议调整待确认 4 内部调剂待确认
     * @return 类型文案
     */
    public static String pendingType(Integer pendingType) {
        if (pendingType == null) {
            return "";
        }
        return switch (pendingType) {
            case 1 -> "拟录取多选一";
            case 2 -> "递补待确认";
            case 3 -> "异议调整待确认";
            case 4 -> "内部调剂待确认";
            default -> "";
        };
    }

    /**
     * 录取来源文案。
     *
     * @param sourceType 1 拟录取 2 递补 3 内部调剂 4 跨室调剂 5 座谈安置
     * @return 来源文案
     */
    public static String sourceType(Integer sourceType) {
        if (sourceType == null) {
            return "";
        }
        return switch (sourceType) {
            case 1 -> "拟录取";
            case 2 -> "递补";
            case 3 -> "内部调剂";
            case 4 -> "跨室调剂";
            case 5 -> "座谈安置";
            default -> "";
        };
    }

    /**
     * 题库题型文案。
     *
     * @param questionType 1 单选 2 多选 3 判断 4 填空
     * @return 题型文案
     */
    public static String questionType(Integer questionType) {
        if (questionType == null) {
            return "";
        }
        return switch (questionType) {
            case 1 -> "单选题";
            case 2 -> "多选题";
            case 3 -> "判断题";
            case 4 -> "填空题";
            default -> "";
        };
    }

    /**
     * 题库题目状态文案。
     *
     * @param status 1 启用 0 停用
     * @return 状态文案
     */
    public static String questionStatus(Integer status) {
        if (status == null) {
            return "";
        }
        return switch (status) {
            case 1 -> "启用";
            case 0 -> "停用";
            default -> "";
        };
    }

    /**
     * 在线试卷状态文案。
     *
     * @param status 1 草稿 2 已发布
     * @return 状态文案
     */
    public static String examPaperStatus(Integer status) {
        if (status == null) {
            return "";
        }
        return switch (status) {
            case 1 -> "草稿";
            case 2 -> "已发布";
            default -> "";
        };
    }

    /**
     * 在线答卷状态文案。
     *
     * @param status 0 未参加 1 答题中 2 已提交
     * @return 状态文案
     */
    public static String examAnswerStatus(Integer status) {
        if (status == null) {
            return "";
        }
        return switch (status) {
            case 0 -> "未参加";
            case 1 -> "答题中";
            case 2 -> "已提交";
            default -> "";
        };
    }
}
