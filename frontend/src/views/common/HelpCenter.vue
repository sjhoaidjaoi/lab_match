<template>
  <section class="help-page">
    <header class="help-header">
      <div>
        <h1>帮助与说明</h1>
        <p>本页面汇总选拔流程、当前角色的操作指引与常见问题。如仍有疑问，请联系学院实训室管理办公室。</p>
      </div>
      <el-tag size="large" type="primary" effect="light">当前身份：{{ roleName }}</el-tag>
    </header>

    <el-alert
      title="选拔按八个阶段依次推进，前一阶段结束并锁定后才会进入下一阶段"
      type="info"
      :closable="false"
      show-icon
      class="help-alert"
    />

    <el-card shadow="never" class="help-card">
      <template #header>
        <div class="card-title">
          <el-icon><List /></el-icon>
          <span>八大阶段说明</span>
        </div>
      </template>
      <el-timeline class="stage-timeline">
        <el-timeline-item
          v-for="stage in stages"
          :key="stage.no"
          :timestamp="`第 ${stage.no} 阶段`"
          placement="top"
          :type="stage.no === currentStageNo ? 'primary' : undefined"
          :hollow="stage.no !== currentStageNo"
        >
          <div class="stage-item" :class="{ active: stage.no === currentStageNo }">
            <div class="stage-name">
              {{ stage.name }}
              <el-tag v-if="stage.no === currentStageNo" size="small" effect="dark">进行中</el-tag>
            </div>
            <p class="stage-desc">{{ stage.desc }}</p>
            <p class="stage-tip">学生：{{ stage.student }}</p>
          </div>
        </el-timeline-item>
      </el-timeline>
    </el-card>

    <el-card shadow="never" class="help-card">
      <template #header>
        <div class="card-title">
          <el-icon><Guide /></el-icon>
          <span>我的操作指引（{{ roleName }}）</span>
        </div>
      </template>
      <ol class="guide-list">
        <li v-for="(item, index) in guides" :key="item.title">
          <span class="guide-index">{{ index + 1 }}</span>
          <div>
            <strong>{{ item.title }}</strong>
            <p>{{ item.detail }}</p>
            <RouterLink v-if="item.path" :to="item.path" class="guide-link">前往该功能 →</RouterLink>
          </div>
        </li>
      </ol>
    </el-card>

    <el-card shadow="never" class="help-card">
      <template #header>
        <div class="card-title">
          <el-icon><QuestionFilled /></el-icon>
          <span>常见问题</span>
        </div>
      </template>
      <el-input v-if="auth.currentRole === 'STUDENT'" v-model="faqQuery" clearable placeholder="搜索常见问题" aria-label="搜索常见问题" />
      <el-empty v-if="!visibleFaqs.length" description="没有匹配的问题" :image-size="56" />
      <el-collapse accordion>
        <el-collapse-item v-for="faq in visibleFaqs" :key="faq.q" :title="faq.q" :name="faq.q">
          <p class="faq-answer">{{ faq.a }}</p>
        </el-collapse-item>
      </el-collapse>
    </el-card>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Guide, List, QuestionFilled } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useCycleStore } from '@/stores/cycle'

interface StageHelp { no: number; name: string; desc: string; student: string }
interface GuideItem { title: string; detail: string; path?: string }

const auth = useAuthStore()
const cycleStore = useCycleStore()

const roleName = computed(() => auth.roleName || '未登录')
const currentStageNo = computed(() => Number(cycleStore.currentStage?.stageNumber || 0))

const stages: StageHelp[] = [
  { no: 1, name: '集中宣讲', desc: '学院统一组织宣讲，介绍实训室方向、技术栈、招生名额与培养计划。', student: '查看实训室介绍与宣讲视频，了解各室方向与名额。' },
  { no: 2, name: '实训室开放日', desc: '各实训室开放参观，提供 720° 全景云游与现场咨询。', student: '查看开放日场次，浏览实训室环境与设备。' },
  { no: 3, name: '学生意向填报', desc: '每名学生最多填报 3 个平行志愿，无先后顺序，并独立选择两项调剂意愿。', student: '填报最多 3 个不同实训室；截止后自动锁定，无法修改。' },
  { no: 4, name: '导师初选与面试考核', desc: '所有报名学生均可参加对应实训室面试，教师从五个维度评分并给出拟录取建议。', student: '按面试时间参加面试，可在“面试安排”查看时间与结果。' },
  { no: 5, name: '拟录取与学生确认', desc: '学生在截止前确认一份拟录取邀请，其余待确认邀请释放名额。', student: '在“拟录取确认”页面选择接受或放弃，注意确认截止时间。' },
  { no: 6, name: '实训室内部调剂', desc: '组长优先使用本室递补候选填补空缺，学生确认后更新录取状态。', student: '收到调剂通知后在“分轮补录”页面确认或拒绝。' },
  { no: 7, name: '学院统筹调剂', desc: '学院统计剩余名额，对服从全院调剂的学生进行跨实训室调剂与沟通安置。', student: '保持通讯畅通，关注“调剂通知”页面的最新安排。' },
  { no: 8, name: '结果公示与正式入组', desc: '学院汇总最终名单、校验名额与重复录取，公示无异议后完成正式入组。', student: '在“最终结果”查看公示名单；如有异议可在公示期内提交。' }
]

const guideMap: Record<string, GuideItem[]> = {
  STUDENT: [
    { title: '完善个人信息', detail: '在“个人信息”中补充手机号与邮箱，便于接收面试与调剂通知。', path: '/student/profile' },
    { title: '完成意向填报', detail: '填报最多 3 个不同实训室，志愿平行无优先级；请谨慎选择是否服从内部调剂与全院调剂。', path: '/student/application' },
    { title: '查看面试安排', detail: '报名成功后即具备面试资格，可在面试安排页面查看时间与地点。', path: '/student/interview' },
    { title: '确认拟录取', detail: '收到拟录取后需在截止时间前确认，超时视为放弃并释放名额。', path: '/student/admission-confirmation' },
    { title: '查看调剂与最终结果', detail: '调剂通知与最终公示均在对应页面展示，公示期内可提交异议。', path: '/student/result' }
  ],
  LAB_TEACHER: [
    { title: '维护本室宣讲信息', detail: '完善项目方向、技术栈、培养计划与宣讲视频，供学生了解。', path: '/teacher/lab-info' },
    { title: '查看报名学生', detail: '仅在报名阶段结束后查看本室报名名单，可导出备查。', path: '/teacher/applications' },
    { title: '安排并完成面试', detail: '为报名学生安排面试时间，按五个维度评分并填写评语与拟录取建议。', path: '/teacher/interviews' },
    { title: '提交拟录取建议', detail: '按面试结果提交拟录取与递补建议，名额不得超过本室计划名额。', path: '/teacher/selection' }
  ],
  LAB_LEADER: [
    { title: '汇总本室选拔结果', detail: '查看本室面试、拟录取与学生确认进度。', path: '/leader/lab-selection' },
    { title: '组织内部调剂', detail: '优先从本室递补候选中选择，提交内部调剂名单并等待学生确认。', path: '/leader/internal-allocation' },
    { title: '上报剩余名额', detail: '内部调剂结束后向学院上报本室剩余名额，进入全院统筹调剂。', path: '/leader/lab-capacity' }
  ],
  COLLEGE_ADMIN: [
    { title: '创建批次与阶段', detail: '设置学年、批次状态与八个阶段的时间窗口，阶段时间决定业务开关。', path: '/college/batches' },
    { title: '维护实训室与学生', detail: '维护实训室名额、组长、导师团队，批量导入学生账号。', path: '/college/labs' },
    { title: '跟踪各阶段进度', detail: '按阶段查看填报、面试、拟录取与确认统计。', path: '/college/preferences' },
    { title: '统筹调剂与安置', detail: '统计剩余名额，处理跨实训室调剂与未落实学生沟通安置。', path: '/college/allocation/vacancies' },
    { title: '审核最终名单并公示', detail: '合并最终名单后先审核，再发布公示；公示结束后批量确认正式入组。', path: '/college/final-list' }
  ]
}

const guides = computed<GuideItem[]>(() => guideMap[auth.currentRole] || [])

const faqs = computed(() => {
  const common = [
    { q: '忘记密码怎么办？', a: '学生与教师账号请联系学院管理员重置密码；学院总负责人账号请由系统管理员处理。' },
    { q: '页面数据与实际不一致怎么办？', a: '先刷新页面；如仍不一致，请联系管理员在“系统操作日志”中核查最近一次相关操作。' },
    { q: '为什么按钮是灰色或提示不在开放时间？', a: '各功能受阶段时间控制，未开始或已截止的阶段无法提交数据，以页面顶部的阶段状态与倒计时为准。' }
  ]
  if (auth.currentRole === 'STUDENT') {
    return [
      { q: '可以填报几个实训室？', a: '最多 3 个，且不能重复；三个志愿为平行志愿，没有先后顺序。' },
      { q: '提交后还能修改志愿吗？', a: '每批次只能提交一次。提交前请核对实训室、导师及两项调剂意愿，如需特殊更正请通过学院公布的渠道咨询。' },
      { q: '同时被多个实训室拟录取怎么办？', a: '需要你在“拟录取确认”页面自主选择其中一个，其余意向自动失效并释放名额给递补学生。' },
      ...common
    ]
  }
  if (auth.currentRole === 'LAB_TEACHER' || auth.currentRole === 'LAB_LEADER') {
    return [
      { q: '可以查看其他实训室的报名或面试数据吗？', a: '不可以。系统按账号所属实训室做数据隔离，仅能查看本室数据。' },
      { q: '拟录取人数可以超过计划名额吗？', a: '不可以。拟录取与最终录取都会校验计划名额，超出时提交会被拒绝。' },
      { q: '学生超时未确认会怎样？', a: '确认时限到达后，学院可执行超时处理，未确认意向失效并触发递补。' },
      ...common
    ]
  }
  return [
    { q: '阶段时间修改后立即生效吗？', a: '修改保存后立即生效，前端顶部的阶段状态与倒计时会同步刷新。' },
    { q: '最终名单审核不通过会怎样？', a: '需先处理超额或重复录取问题，再重新合并并提交审核。' },
    { q: '公示期可以发布吗？', a: '最终名单必须审核通过且公示起止时间合法，系统才允许发布。' },
    ...common
  ]
})
const faqQuery = ref('')
const visibleFaqs = computed(() => faqs.value.filter(faq => (faq.q + faq.a).toLowerCase().includes(faqQuery.value.trim().toLowerCase())))
</script>

<style scoped>
.help-page { display: flex; flex-direction: column; gap: 16px; color: #1f2937; }
.help-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.help-header h1 { margin: 0 0 6px; font-size: 22px; font-weight: 600; }
.help-header p { margin: 0; font-size: 13px; color: #6b7280; max-width: 720px; line-height: 1.7; }
.help-alert { border-radius: 8px; }
.help-card { border-radius: 10px; }
.card-title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 15px; }
.stage-timeline { padding-left: 4px; }
.stage-item { border-radius: 8px; padding: 8px 12px; border: 1px solid transparent; }
.stage-item.active { background: #f0f5ff; border-color: #dbe6ff; }
.stage-name { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 14px; }
.stage-desc { margin: 6px 0 4px; font-size: 13px; color: #4b5563; line-height: 1.6; }
.stage-tip { margin: 0; font-size: 12px; color: #7b8aa8; }
.guide-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 14px; }
.guide-list li { display: flex; gap: 12px; }
.guide-index { flex: 0 0 24px; height: 24px; border-radius: 50%; background: #2f6fed; color: #fff; font-size: 12px; display: flex; align-items: center; justify-content: center; }
.guide-list strong { font-size: 14px; }
.guide-list p { margin: 4px 0 0; font-size: 13px; color: #6b7280; line-height: 1.6; }
.guide-link { display: inline-block; margin-top: 4px; font-size: 12px; color: #2f6fed; text-decoration: none; }
.guide-link:hover { text-decoration: underline; }
.faq-answer { margin: 0; font-size: 13px; color: #4b5563; line-height: 1.7; }
@media (max-width: 768px) {
  .help-header { flex-direction: column; }
  .help-header h1 { font-size: 18px; }
  .help-page { gap: 12px; }
}
</style>
