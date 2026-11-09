package com.labmatch.module.base.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labmatch.module.auth.entity.UserAccount;
import com.labmatch.module.auth.mapper.UserAccountMapper;
import com.labmatch.module.base.dto.LabDetailView;
import com.labmatch.module.base.dto.LabView;
import com.labmatch.module.base.dto.MentorView;
import com.labmatch.module.base.entity.Announcement;
import com.labmatch.module.base.entity.Cycle;
import com.labmatch.module.base.entity.Lab;
import com.labmatch.module.base.entity.MentorProfile;
import com.labmatch.module.base.entity.OpenDayPlan;
import com.labmatch.module.base.entity.QuotaBalance;
import com.labmatch.module.base.mapper.AnnouncementMapper;
import com.labmatch.module.base.mapper.CycleMapper;
import com.labmatch.module.base.mapper.LabMapper;
import com.labmatch.module.base.mapper.MentorProfileMapper;
import com.labmatch.module.base.mapper.OpenDayPlanMapper;
import com.labmatch.module.base.mapper.QuotaBalanceMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 公共目录：实训室、导师、公告、开放日。对应阶段一/二/三的信息展示。
 */
@Service
@RequiredArgsConstructor
public class CatalogService {

    private final LabMapper labMapper;
    private final MentorProfileMapper mentorProfileMapper;
    private final QuotaBalanceMapper quotaBalanceMapper;
    private final UserAccountMapper userAccountMapper;
    private final CycleMapper cycleMapper;
    private final AnnouncementMapper announcementMapper;
    private final OpenDayPlanMapper openDayPlanMapper;

    public List<LabView> labs() {
        Long cycleId = currentCycleId();
        List<QuotaBalance> balances = cycleId == null ? List.of()
                : quotaBalanceMapper.selectList(new LambdaQueryWrapper<QuotaBalance>().eq(QuotaBalance::getCycleId, cycleId));
        Map<Long, MentorProfile> mentorMap = mentorProfileMapper.selectList(null).stream()
                .collect(Collectors.toMap(MentorProfile::getId, Function.identity()));
        Map<Long, Integer> remainingByLab = balances.stream()
                .filter(b -> mentorMap.containsKey(b.getMentorId()))
                .collect(Collectors.groupingBy(
                        b -> mentorMap.get(b.getMentorId()).getLabId(),
                        Collectors.summingInt(b -> b.getQuota() - b.getUsed() - b.getReserved())));

        List<Lab> labs = labMapper.selectList(new LambdaQueryWrapper<Lab>().orderByAsc(Lab::getId));
        Map<Long, Long> mentorCount = mentorMap.values().stream()
                .collect(Collectors.groupingBy(MentorProfile::getLabId, Collectors.counting()));

        return labs.stream().map(lab -> {
            LabView view = new LabView();
            view.setId(lab.getId());
            view.setName(lab.getName());
            view.setDepartment(lab.getDepartment());
            view.setLeaderName(userName(lab.getLeaderId()));
            view.setDirections(lab.getDirections());
            view.setTotalQuota(lab.getTotalQuota());
            view.setRemaining(remainingByLab.getOrDefault(lab.getId(), 0));
            view.setMentorCount(mentorCount.getOrDefault(lab.getId(), 0L).intValue());
            view.setStatus(lab.getStatus());
            return view;
        }).toList();
    }

    public LabDetailView labDetail(Long labId) {
        Lab lab = labMapper.selectById(labId);
        if (lab == null) {
            return null;
        }
        LabDetailView view = new LabDetailView();
        view.setLab(lab);
        view.setLeaderName(userName(lab.getLeaderId()));
        List<MentorView> mentors = mentorsOfLab(labId);
        view.setMentors(mentors);
        view.setRemaining(mentors.stream().mapToInt(MentorView::getAvailable).sum());
        return view;
    }

    public List<MentorView> mentors() {
        return mentorViews(null);
    }

    public List<MentorView> mentorsOfLab(Long labId) {
        return mentorViews(labId);
    }

    public List<Announcement> announcements(Long cycleId) {
        return announcementMapper.selectList(new LambdaQueryWrapper<Announcement>()
                .eq(cycleId != null, Announcement::getCycleId, cycleId)
                .eq(Announcement::getStatus, "PUBLISHED")
                .orderByDesc(Announcement::getPublishAt));
    }

    public List<OpenDayPlan> openDayPlans(Long cycleId) {
        return openDayPlanMapper.selectList(new LambdaQueryWrapper<OpenDayPlan>()
                .eq(cycleId != null, OpenDayPlan::getCycleId, cycleId)
                .orderByAsc(OpenDayPlan::getDateAt));
    }

    private List<MentorView> mentorViews(Long labId) {
        Long cycleId = currentCycleId();
        List<MentorProfile> profiles = mentorProfileMapper.selectList(new LambdaQueryWrapper<MentorProfile>()
                .eq(labId != null, MentorProfile::getLabId, labId)
                .eq(MentorProfile::getStatus, "ACTIVE")
                .orderByAsc(MentorProfile::getId));
        Map<Long, Lab> labs = labMapper.selectList(null).stream()
                .collect(Collectors.toMap(Lab::getId, Function.identity()));
        Map<Long, QuotaBalance> balances = (cycleId == null ? List.<QuotaBalance>of()
                : quotaBalanceMapper.selectList(new LambdaQueryWrapper<QuotaBalance>().eq(QuotaBalance::getCycleId, cycleId)))
                .stream().collect(Collectors.toMap(QuotaBalance::getMentorId, Function.identity()));

        return profiles.stream().map(profile -> {
            MentorView view = new MentorView();
            view.setId(profile.getId());
            view.setUserId(profile.getUserId());
            view.setName(userName(profile.getUserId()));
            view.setTitle(profile.getTitle());
            view.setDirection(profile.getDirection());
            view.setLabId(profile.getLabId());
            Lab lab = labs.get(profile.getLabId());
            view.setLabName(lab == null ? null : lab.getName());
            QuotaBalance balance = balances.get(profile.getId());
            view.setQuota(balance == null ? profile.getQuotaSuggest() : balance.getQuota());
            view.setUsed(balance == null ? 0 : balance.getUsed());
            view.setReserved(balance == null ? 0 : balance.getReserved());
            return view;
        }).toList();
    }

    private Long currentCycleId() {
        Cycle cycle = cycleMapper.selectOne(new LambdaQueryWrapper<Cycle>()
                .eq(Cycle::getStatus, "RUNNING")
                .orderByDesc(Cycle::getId)
                .last("LIMIT 1"));
        return cycle == null ? null : cycle.getId();
    }

    private String userName(Long userId) {
        if (userId == null) {
            return null;
        }
        UserAccount account = userAccountMapper.selectById(userId);
        return account == null ? null : account.getName();
    }
}
