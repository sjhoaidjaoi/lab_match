package com.labmatch.seed;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labmatch.module.auth.entity.UserAccount;
import com.labmatch.module.auth.entity.UserRole;
import com.labmatch.module.auth.mapper.UserAccountMapper;
import com.labmatch.module.auth.mapper.UserRoleMapper;
import com.labmatch.module.base.entity.Announcement;
import com.labmatch.module.base.entity.Cycle;
import com.labmatch.module.base.entity.Lab;
import com.labmatch.module.base.entity.LabPanorama;
import com.labmatch.module.base.entity.LabQuota;
import com.labmatch.module.base.entity.LabVideo;
import com.labmatch.module.base.entity.MentorProfile;
import com.labmatch.module.base.entity.OpenDayPlan;
import com.labmatch.module.base.entity.QuotaBalance;
import com.labmatch.module.base.entity.Round;
import com.labmatch.module.base.mapper.AnnouncementMapper;
import com.labmatch.module.base.mapper.CycleMapper;
import com.labmatch.module.base.mapper.LabMapper;
import com.labmatch.module.base.mapper.LabPanoramaMapper;
import com.labmatch.module.base.mapper.LabQuotaMapper;
import com.labmatch.module.base.mapper.LabVideoMapper;
import com.labmatch.module.base.mapper.MentorProfileMapper;
import com.labmatch.module.base.mapper.OpenDayPlanMapper;
import com.labmatch.module.base.mapper.QuotaBalanceMapper;
import com.labmatch.module.base.mapper.RoundMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 演示数据：首次启动自动生成账号、实训室、导师、周期与名额。
 * 生成后可通过 lab-match.demo-data=false 关闭。
 * 统一初始密码：123456
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DemoDataInitializer implements ApplicationRunner {

    private static final String DEFAULT_PASSWORD = "123456";

    private final UserAccountMapper userAccountMapper;
    private final UserRoleMapper userRoleMapper;
    private final LabMapper labMapper;
    private final MentorProfileMapper mentorProfileMapper;
    private final CycleMapper cycleMapper;
    private final RoundMapper roundMapper;
    private final LabQuotaMapper labQuotaMapper;
    private final QuotaBalanceMapper quotaBalanceMapper;
    private final AnnouncementMapper announcementMapper;
    private final OpenDayPlanMapper openDayPlanMapper;
    private final LabVideoMapper labVideoMapper;
    private final LabPanoramaMapper labPanoramaMapper;
    private final PasswordEncoder passwordEncoder;

    @Value("${lab-match.demo-data:true}")
    private boolean enabled;

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled) {
            return;
        }
        if (userAccountMapper.selectCount(null) > 0) {
            seedMediaIfEmpty();
            return;
        }
        log.info("检测到空库，开始生成演示数据（统一初始密码：{}）", DEFAULT_PASSWORD);

        UserAccount admin = createUser("admin", null, "A0001", "学院管理员", "13800000001");
        UserAccount leader = createUser("T1000", null, "T1000", "李敏", "13800001000");
        UserAccount mentor1 = createUser("T1001", null, "T1001", "王强", "13800001001");
        UserAccount mentor2 = createUser("T1002", null, "T1002", "赵雪", "13800001002");
        UserAccount student1 = createUser("2022001", "2022001", null, "陈晨", "13900002001");
        UserAccount student2 = createUser("2022002", "2022002", null, "林小雨", "13900002002");
        UserAccount student3 = createUser("2022003", "2022003", null, "周航", "13900002003");

        Lab lab = new Lab();
        lab.setName("AI 与智能系统实训室");
        lab.setDepartment("计算机学院");
        lab.setLeaderId(leader.getId());
        lab.setIntro("面向 AI + PBL 项目实训，覆盖机器学习、计算机视觉与智能系统方向。");
        lab.setDirections("机器学习,计算机视觉,智能系统");
        lab.setFacilities("GPU 工作站 8 台、机器人实验台 4 套");
        lab.setTrainingPlan("每届培养周期 12 个月，每周投入不少于 8 小时，以项目组方式开展实训。");
        lab.setAssessment("阶段汇报 + 项目答辩 + 代码与文档评审");
        lab.setOpenDayInfo("10 月 29 日—30 日 14:00-17:00，实训楼 A301");
        lab.setTotalQuota(10);
        lab.setStatus("ACTIVE");
        labMapper.insert(lab);

        createRole(admin.getId(), "COLLEGE_ADMIN", "COLLEGE", null);
        createRole(admin.getId(), "SYS_ADMIN", "ALL", null);
        createRole(leader.getId(), "MENTOR", "LAB", lab.getId());
        createRole(leader.getId(), "LAB_HEAD", "LAB", lab.getId());
        createRole(mentor1.getId(), "MENTOR", "LAB", lab.getId());
        createRole(mentor2.getId(), "MENTOR", "LAB", lab.getId());
        createRole(student1.getId(), "STUDENT", "SELF", null);
        createRole(student2.getId(), "STUDENT", "SELF", null);
        createRole(student3.getId(), "STUDENT", "SELF", null);

        MentorProfile p1 = createMentor(leader.getId(), lab.getId(), "副教授", "智能系统与边缘计算", 4);
        MentorProfile p2 = createMentor(mentor1.getId(), lab.getId(), "讲师", "计算机视觉", 3);
        MentorProfile p3 = createMentor(mentor2.getId(), lab.getId(), "讲师", "自然语言处理", 3);

        LocalDateTime now = LocalDateTime.now().withSecond(0).withNano(0);
        LocalDateTime adjustStart = now.plusDays(2).plusHours(23);
        Cycle cycle = new Cycle();
        cycle.setName("2026 年秋季学生实训室进组选拔");
        cycle.setCycleYear(2026);
        cycle.setStatus("RUNNING");
        cycle.setCurrentRound(1);
        cycle.setAnnounceAt(now.minusDays(3));
        cycle.setOpenDayStart(now.minusDays(2));
        cycle.setOpenDayEnd(now.minusDays(1));
        cycle.setAdjustStart(adjustStart);
        cycle.setAdjustEnd(adjustStart.plusHours(4));
        cycle.setPublicityStart(adjustStart.plusHours(5));
        cycle.setPublicityEnd(adjustStart.plusDays(1));
        cycleMapper.insert(cycle);

        // 第 1 轮：演示时处于“意向填报”窗口
        LocalDateTime r1ApplyEnd = now.plusHours(3);
        LocalDateTime r1InterviewEnd = now.plusHours(20);
        LocalDateTime r1ConfirmStart = now.plusDays(1);
        createRound(cycle.getId(), 1, "OPEN", now.minusHours(1), r1ApplyEnd,
                r1ApplyEnd, r1InterviewEnd, r1ConfirmStart, r1ConfirmStart.plusHours(12));

        // 第 2 轮（补录）
        LocalDateTime r2ApplyStart = r1ConfirmStart.plusHours(13);
        LocalDateTime r2ApplyEnd = r2ApplyStart.plusHours(3);
        createRound(cycle.getId(), 2, "PENDING", r2ApplyStart, r2ApplyEnd,
                r2ApplyEnd, r2ApplyEnd.plusHours(4), r2ApplyEnd.plusHours(4), r2ApplyEnd.plusHours(8));

        // 第 3 轮（补录），在统筹调剂前结束
        LocalDateTime r3ApplyStart = r2ApplyEnd.plusHours(9);
        LocalDateTime r3ApplyEnd = r3ApplyStart.plusHours(2);
        createRound(cycle.getId(), 3, "PENDING", r3ApplyStart, r3ApplyEnd,
                r3ApplyEnd, r3ApplyEnd.plusHours(2), r3ApplyEnd.plusHours(2), r3ApplyEnd.plusHours(4));

        createQuota(cycle.getId(), lab.getId(), p1.getId(), 4);
        createQuota(cycle.getId(), lab.getId(), p2.getId(), 3);
        createQuota(cycle.getId(), lab.getId(), p3.getId(), 3);

        Announcement announcement = new Announcement();
        announcement.setCycleId(cycle.getId());
        announcement.setTitle("2026 年秋季实训室进组选拔集中宣讲通知");
        announcement.setType("BRIEFING");
        announcement.setContent("学院将于 10 月 28 日 19:00 组织集中宣讲，各实训室导师介绍方向、名额、培养安排与考核要求，请同学们准时参加。");
        announcement.setStatus("PUBLISHED");
        announcement.setPublishAt(now.minusDays(4));
        announcement.setCreatedBy(admin.getId());
        announcementMapper.insert(announcement);

        createOpenDay(cycle.getId(), lab.getId(), LocalDate.now().minusDays(2), "14:00", "17:00");
        createOpenDay(cycle.getId(), lab.getId(), LocalDate.now().minusDays(1), "14:00", "17:00");

        seedMediaIfEmpty();

        log.info("演示数据生成完成：admin / T1000 / T1001 / T1002 / 2022001 / 2022002 / 2022003，密码均为 {}", DEFAULT_PASSWORD);
    }

    /**
     * 阶段一宣讲视频 / 阶段二全景云游示例数据。地址为占位资源，实际使用时由管理端替换。
     */
    private void seedMediaIfEmpty() {
        if (labVideoMapper.selectCount(null) > 0 || labPanoramaMapper.selectCount(null) > 0) {
            return;
        }
        Lab lab = labMapper.selectList(new LambdaQueryWrapper<Lab>().orderByAsc(Lab::getId).last("LIMIT 1")).stream()
                .findFirst().orElse(null);
        if (lab == null) {
            return;
        }

        createVideo(lab.getId(), "AI 与智能系统实训室 · 方向宣讲", "导师介绍研究方向、培养计划、名额与考核要求。", 1);
        createVideo(lab.getId(), "AI 与智能系统实训室 · 项目成果展示", "往届学生项目演示与实训室日常安排。", 2);

        LabPanorama panorama = new LabPanorama();
        panorama.setLabId(lab.getId());
        panorama.setName("AI 与智能系统实训室 · 720° 全景云游");
        panorama.setDescription("示例链接：请替换为实训室全景作品地址（支持 720 云 / Krpano / 自建全景页）。");
        panorama.setPanoramaType("LINK");
        panorama.setPanoramaUrl("https://www.720yun.com/");
        panorama.setSortNo(1);
        panorama.setStatus("PUBLISHED");
        labPanoramaMapper.insert(panorama);
    }

    private void createVideo(Long labId, String title, String description, int sortNo) {
        LabVideo video = new LabVideo();
        video.setLabId(labId);
        video.setTitle(title);
        video.setDescription(description);
        video.setVideoType("MP4");
        video.setVideoUrl("/media/demo/lab-" + labId + "-briefing-" + sortNo + ".mp4");
        video.setSortNo(sortNo);
        video.setStatus("PUBLISHED");
        labVideoMapper.insert(video);
    }

    private UserAccount createUser(String loginName, String studentNo, String employeeNo, String name, String phone) {
        UserAccount user = new UserAccount();
        user.setLoginName(loginName);
        user.setStudentNo(studentNo);
        user.setEmployeeNo(employeeNo);
        user.setName(name);
        user.setPhone(phone);
        user.setStatus("ENABLED");
        user.setPasswordHash(passwordEncoder.encode(DEFAULT_PASSWORD));
        user.setMustChangePassword(false);
        userAccountMapper.insert(user);
        return user;
    }

    private void createRole(Long userId, String roleCode, String scopeType, Long scopeId) {
        UserRole role = new UserRole();
        role.setUserId(userId);
        role.setRoleCode(roleCode);
        role.setScopeType(scopeType);
        role.setScopeId(scopeId);
        role.setActive(true);
        userRoleMapper.insert(role);
    }

    private MentorProfile createMentor(Long userId, Long labId, String title, String direction, int quota) {
        MentorProfile profile = new MentorProfile();
        profile.setUserId(userId);
        profile.setLabId(labId);
        profile.setTitle(title);
        profile.setDirection(direction);
        profile.setTrainingPlan("参与 AI + PBL 项目，按周汇报进展");
        profile.setAssessment("代码评审 + 项目答辩");
        profile.setQuotaSuggest(quota);
        profile.setStatus("ACTIVE");
        mentorProfileMapper.insert(profile);
        return profile;
    }

    private void createRound(Long cycleId, int roundNo, String status,
                             LocalDateTime applyStart, LocalDateTime applyEnd,
                             LocalDateTime interviewStart, LocalDateTime interviewEnd,
                             LocalDateTime confirmStart, LocalDateTime confirmEnd) {
        Round round = new Round();
        round.setCycleId(cycleId);
        round.setRoundNo(roundNo);
        round.setStatus(status);
        round.setApplyStart(applyStart);
        round.setApplyEnd(applyEnd);
        round.setInterviewStart(interviewStart);
        round.setInterviewEnd(interviewEnd);
        round.setConfirmStart(confirmStart);
        round.setConfirmEnd(confirmEnd);
        roundMapper.insert(round);
    }

    private void createQuota(Long cycleId, Long labId, Long mentorId, int quota) {
        LabQuota labQuota = new LabQuota();
        labQuota.setCycleId(cycleId);
        labQuota.setLabId(labId);
        labQuota.setMentorId(mentorId);
        labQuota.setQuota(quota);
        labQuotaMapper.insert(labQuota);

        QuotaBalance balance = new QuotaBalance();
        balance.setCycleId(cycleId);
        balance.setMentorId(mentorId);
        balance.setQuota(quota);
        balance.setUsed(0);
        balance.setReserved(0);
        quotaBalanceMapper.insert(balance);
    }

    private void createOpenDay(Long cycleId, Long labId, LocalDate date, String start, String end) {
        OpenDayPlan plan = new OpenDayPlan();
        plan.setCycleId(cycleId);
        plan.setLabId(labId);
        plan.setDateAt(date);
        plan.setStartTime(start);
        plan.setEndTime(end);
        plan.setLocation("实训楼 A301");
        plan.setNote("请携带学生证，现场安排导师答疑");
        plan.setStatus("PUBLISHED");
        openDayPlanMapper.insert(plan);
    }
}
