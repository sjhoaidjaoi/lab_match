package com.college.labselect.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.college.labselect.common.DesensitizeUtils;
import com.college.labselect.common.PageResult;
import com.college.labselect.common.ResultCode;
import com.college.labselect.common.StatusTextUtils;
import com.college.labselect.dto.req.DisputeHandleReqDTO;
import com.college.labselect.dto.req.DisputeSubmitReqDTO;
import com.college.labselect.dto.resp.DisputeHandleRespVO;
import com.college.labselect.dto.resp.DisputeItemVO;
import com.college.labselect.dto.resp.DisputeSubmitRespVO;
import com.college.labselect.entity.Admission;
import com.college.labselect.entity.Dispute;
import com.college.labselect.entity.MentorProfile;
import com.college.labselect.entity.OperationLog;
import com.college.labselect.entity.Publicity;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.entity.SysUser;
import com.college.labselect.entity.UserNotice;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.AdmissionMapper;
import com.college.labselect.mapper.DisputeMapper;
import com.college.labselect.mapper.LabMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.OperationLogMapper;
import com.college.labselect.mapper.PublicityMapper;
import com.college.labselect.mapper.SelectionRoundMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.mapper.UserNoticeMapper;
import com.college.labselect.service.IDisputeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
 * 异议工单服务实现。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DisputeServiceImpl implements IDisputeService {

    private static final int STATUS_PENDING = 1;
    private static final int STATUS_HANDLED = 3;
    private static final int PUBLICITY_ACTIVE = 1;
    private static final int ADMISSION_CONFIRMED = 2;
    private static final int ADMISSION_ENROLLED = 3;
    private static final int LOCKED = 1;
    private static final int USER_TYPE_ADMIN = 3;
    private static final int NOTICE_TYPE_SYSTEM = 1;
    private static final int NOTICE_TYPE_CONFIRM = 4;
    private static final int MAX_CONTENT_LENGTH = 500;
    private static final int MAX_ATTACHMENTS = 3;
    private static final int MAX_ATTACHMENT_LENGTH = 1000;

    private final DisputeMapper disputeMapper;
    private final PublicityMapper publicityMapper;
    private final AdmissionMapper admissionMapper;
    private final SelectionRoundMapper selectionRoundMapper;
    private final MentorProfileMapper mentorProfileMapper;
    private final SysUserMapper sysUserMapper;
    private final LabMapper labMapper;
    private final UserNoticeMapper userNoticeMapper;
    private final OperationLogMapper operationLogMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DisputeSubmitRespVO submitDispute(Long studentUserId, DisputeSubmitReqDTO req) {
        Publicity publicity = requirePublicity(req.getPublicityId());
        LocalDateTime now = LocalDateTime.now();
        if (!Integer.valueOf(PUBLICITY_ACTIVE).equals(publicity.getStatus())
                || publicity.getStartTime() == null || publicity.getEndTime() == null
                || now.isBefore(publicity.getStartTime()) || now.isAfter(publicity.getEndTime())) {
            throw new BusinessException(ResultCode.OUT_OF_TIME_WINDOW, "公示已结束，无法提交异议");
        }
        if (StrUtil.length(req.getContent()) > MAX_CONTENT_LENGTH) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "异议说明最长 500 字");
        }
        List<String> attachments = Optional.ofNullable(req.getAttachments()).orElse(List.of());
        String attachmentUrl = attachments.stream().filter(StrUtil::isNotBlank)
                .collect(Collectors.joining(","));
        if (attachments.size() > MAX_ATTACHMENTS || attachmentUrl.length() > MAX_ATTACHMENT_LENGTH) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "附件最多 3 个且地址合计不超过 1000 字符");
        }
        long duplicate = disputeMapper.selectCount(new LambdaQueryWrapper<Dispute>()
                .eq(Dispute::getPublicityId, publicity.getId())
                .eq(Dispute::getStudentId, studentUserId));
        if (duplicate > 0) {
            throw new BusinessException(ResultCode.DUPLICATE_SUBMIT, "你已提交过异议，请等待处理");
        }
        Dispute dispute = new Dispute();
        dispute.setPublicityId(publicity.getId());
        dispute.setStudentId(studentUserId);
        dispute.setDisputeType(req.getDisputeType());
        dispute.setContent(req.getContent());
        dispute.setAttachmentUrl(StrUtil.blankToDefault(attachmentUrl, null));
        dispute.setStatus(STATUS_PENDING);
        disputeMapper.insert(dispute);
        notifyAdmins(dispute);
        log.info("提交异议，disputeId={}，studentId={}", dispute.getId(), studentUserId);
        DisputeSubmitRespVO resp = new DisputeSubmitRespVO();
        resp.setId(dispute.getId());
        resp.setStatus(STATUS_PENDING);
        return resp;
    }

    @Override
    public PageResult<DisputeItemVO> listMyDisputes(Long studentUserId, long pageNum, long pageSize) {
        Page<Dispute> page = disputeMapper.selectPage(new Page<>(pageNum, pageSize),
                new LambdaQueryWrapper<Dispute>()
                        .eq(Dispute::getStudentId, studentUserId)
                        .orderByDesc(Dispute::getId));
        return PageResult.of(page.convert(dispute -> toItem(dispute, false)));
    }

    @Override
    public DisputeItemVO getMyDispute(Long studentUserId, Long id) {
        Dispute dispute = disputeMapper.selectById(id);
        if (dispute == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "异议工单不存在");
        }
        if (!Objects.equals(dispute.getStudentId(), studentUserId)) {
            throw new BusinessException(ResultCode.FORBIDDEN, "无权查看他人的异议工单");
        }
        return toItem(dispute, false);
    }

    @Override
    public PageResult<DisputeItemVO> listAdminDisputes(Integer status, Long publicityId,
                                                       long pageNum, long pageSize) {
        Page<Dispute> page = disputeMapper.selectPage(new Page<>(pageNum, pageSize),
                new LambdaQueryWrapper<Dispute>()
                        .eq(status != null, Dispute::getStatus, status)
                        .eq(publicityId != null, Dispute::getPublicityId, publicityId)
                        .orderByDesc(Dispute::getId));
        return PageResult.of(page.convert(dispute -> toItem(dispute, true)));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DisputeHandleRespVO handleDispute(Long adminUserId, Long id, DisputeHandleReqDTO req) {
        Dispute dispute = disputeMapper.selectById(id);
        if (dispute == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "异议工单不存在");
        }
        if (!Integer.valueOf(STATUS_PENDING).equals(dispute.getStatus())) {
            throw new BusinessException(ResultCode.DUPLICATE_SUBMIT, "该异议已处理");
        }
        Publicity publicity = requirePublicity(dispute.getPublicityId());
        SelectionRound round = selectionRoundMapper.selectById(publicity.getRoundId());
        if (round == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "选拔轮次不存在");
        }
        if (Integer.valueOf(2).equals(req.getHandleResult())) {
            adjustAdmission(dispute, round, req);
        }
        LocalDateTime handleTime = LocalDateTime.now();
        dispute.setStatus(STATUS_HANDLED);
        dispute.setHandlerId(adminUserId);
        dispute.setHandleResult(req.getHandleResult());
        dispute.setHandleOpinion(req.getHandleOpinion());
        dispute.setHandleTime(handleTime);
        disputeMapper.updateById(dispute);
        writeLog(adminUserId, id, "status=" + STATUS_PENDING, "status=" + STATUS_HANDLED,
                req.getHandleOpinion());
        notifyStudent(dispute);
        DisputeHandleRespVO resp = new DisputeHandleRespVO();
        resp.setId(id);
        resp.setStatus(STATUS_HANDLED);
        resp.setHandleTime(handleTime);
        log.info("处理异议，disputeId={}，result={}", id, req.getHandleResult());
        return resp;
    }

    /**
     * 处理结果 2：调整录取导师。
     *
     * @param dispute 异议工单
     * @param round   轮次
     * @param req     处理请求
     */
    private void adjustAdmission(Dispute dispute, SelectionRound round, DisputeHandleReqDTO req) {
        if (Integer.valueOf(LOCKED).equals(round.getLocked())) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "批次已锁定，调整录取必须先解锁");
        }
        if (req.getAdjustMentorId() == null) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "调整录取时必须指定目标导师");
        }
        MentorProfile target = mentorProfileMapper.selectById(req.getAdjustMentorId());
        if (target == null || !Integer.valueOf(1).equals(target.getStatus())
                || Optional.ofNullable(target.getQuota()).orElse(0)
                <= Optional.ofNullable(target.getQuotaUsed()).orElse(0)) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, "目标导师剩余名额不足");
        }
        Admission admission = admissionMapper.selectOne(new LambdaQueryWrapper<Admission>()
                .eq(Admission::getRoundId, round.getId())
                .eq(Admission::getStudentId, dispute.getStudentId())
                .in(Admission::getStatus, ADMISSION_CONFIRMED, ADMISSION_ENROLLED));
        if (admission == null) {
            throw new BusinessException(ResultCode.STATUS_NOT_ALLOWED, "该学生无可调整的录取记录");
        }
        if (!Objects.equals(admission.getMentorId(), target.getId())) {
            int updated = mentorProfileMapper.update(null, new UpdateWrapper<MentorProfile>()
                    .setSql("quota_used = quota_used + 1")
                    .eq("id", target.getId())
                    .apply("quota_used < quota"));
            if (updated == 0) {
                throw new BusinessException(ResultCode.BUSINESS_ERROR, "目标导师剩余名额不足");
            }
            mentorProfileMapper.decreaseQuotaUsed(admission.getMentorId(), 1);
        }
        Admission update = new Admission();
        update.setId(admission.getId());
        update.setMentorId(target.getId());
        update.setLabId(target.getLabId());
        update.setStatus(ADMISSION_CONFIRMED);
        update.setActiveFlag(1);
        admissionMapper.updateById(update);
    }

    /**
     * 异议工单转视图。
     *
     * @param dispute 工单
     * @param masked  是否脱敏学生信息
     * @return 视图
     */
    private DisputeItemVO toItem(Dispute dispute, boolean masked) {
        SysUser student = sysUserMapper.selectById(dispute.getStudentId());
        Publicity publicity = publicityMapper.selectById(dispute.getPublicityId());
        SysUser handler = dispute.getHandlerId() == null ? null : sysUserMapper.selectById(dispute.getHandlerId());
        DisputeItemVO vo = new DisputeItemVO();
        vo.setId(dispute.getId());
        vo.setDisputeNo("D" + dispute.getId());
        vo.setPublicityId(dispute.getPublicityId());
        vo.setPublicityTitle(publicity == null ? "" : publicity.getTitle());
        vo.setStudentId(dispute.getStudentId());
        vo.setStudentNo(student == null ? "" : (masked ? DesensitizeUtils.maskUserNo(student.getUserNo())
                : student.getUserNo()));
        vo.setStudentName(student == null ? "" : (masked ? DesensitizeUtils.maskName(student.getRealName())
                : student.getRealName()));
        vo.setDisputeType(dispute.getDisputeType());
        vo.setDisputeTypeText(StatusTextUtils.disputeType(dispute.getDisputeType()));
        vo.setContent(dispute.getContent());
        vo.setAttachments(StrUtil.isBlank(dispute.getAttachmentUrl()) ? List.of()
                : StrUtil.split(dispute.getAttachmentUrl(), ','));
        vo.setStatus(dispute.getStatus());
        vo.setStatusText(StatusTextUtils.disputeStatus(dispute.getStatus()));
        vo.setHandleResult(dispute.getHandleResult());
        vo.setHandleResultText(StatusTextUtils.disputeHandleResult(dispute.getHandleResult()));
        vo.setHandleOpinion(dispute.getHandleOpinion());
        vo.setHandlerId(dispute.getHandlerId());
        vo.setHandlerName(handler == null ? "" : handler.getRealName());
        vo.setHandleTime(dispute.getHandleTime());
        vo.setGmtCreate(dispute.getGmtCreate());
        return vo;
    }

    /**
     * 查询公示批次。
     *
     * @param id 公示 ID
     * @return 公示批次
     */
    private Publicity requirePublicity(Long id) {
        Publicity publicity = publicityMapper.selectById(id);
        if (publicity == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "公示批次不存在");
        }
        return publicity;
    }

    /**
     * 提交异议后通知管理员。
     *
     * @param dispute 异议工单
     */
    private void notifyAdmins(Dispute dispute) {
        List<SysUser> admins = sysUserMapper.selectList(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getUserType, USER_TYPE_ADMIN));
        for (SysUser admin : admins) {
            UserNotice notice = new UserNotice();
            notice.setUserId(admin.getId());
            notice.setTitle("新异议待处理");
            notice.setContent("有一条新的公示异议工单待处理。");
            notice.setNoticeType(NOTICE_TYPE_SYSTEM);
            notice.setBizType("DISPUTE");
            notice.setBizId(dispute.getId());
            notice.setIsRead(0);
            try {
                userNoticeMapper.insert(notice);
            } catch (Exception exception) {
                log.info("管理员异议通知已存在，忽略重复写入，disputeId={}", dispute.getId());
            }
        }
    }

    /**
     * 处理异议后通知学生。
     *
     * @param dispute 异议工单
     */
    private void notifyStudent(Dispute dispute) {
        UserNotice notice = new UserNotice();
        notice.setUserId(dispute.getStudentId());
        notice.setTitle("异议处理结果");
        notice.setContent("你的异议已处理：" + StrUtil.nullToEmpty(dispute.getHandleOpinion()));
        notice.setNoticeType(NOTICE_TYPE_CONFIRM);
        notice.setBizType("DISPUTE");
        notice.setBizId(dispute.getId());
        notice.setIsRead(0);
        try {
            userNoticeMapper.insert(notice);
        } catch (Exception exception) {
            log.info("学生异议通知已存在，忽略重复写入，disputeId={}", dispute.getId());
        }
    }

    /**
     * 写异议处理日志。
     *
     * @param operatorId 操作人
     * @param disputeId  工单 ID
     * @param before     变更前
     * @param after      变更后
     * @param reason     处理意见
     */
    private void writeLog(Long operatorId, Long disputeId, String before, String after, String reason) {
        SysUser operator = sysUserMapper.selectById(operatorId);
        OperationLog operationLog = new OperationLog();
        operationLog.setOperatorId(operatorId);
        operationLog.setOperatorName(operator == null ? "" : operator.getRealName());
        operationLog.setBizType("DISPUTE");
        operationLog.setBizId(disputeId);
        operationLog.setAction("处理异议");
        operationLog.setBeforeValue(before);
        operationLog.setAfterValue(after);
        operationLog.setReason(reason);
        operationLogMapper.insert(operationLog);
    }
}
