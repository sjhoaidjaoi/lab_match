<template>
  <div class="page">
    <PageHeader :title="`面试评价 · ${record?.realName || ''}`" :desc="`${record?.studentNumber || ''} · ${record?.time || ''} · ${record?.location || ''}`">
      <template #actions>
        <el-button @click="router.back()">返回</el-button>
        <el-button type="primary" :disabled="readOnly" @click="save">保存评价</el-button>
      </template>
    </PageHeader>

    <el-alert
      v-if="stageClosed"
      :title="expired
        ? `评价截止 ${evaluationDeadline} 已过，不能再修改评价`
        : `当前处于第 ${stage.current.no} 阶段（${stage.current.name}），评价已按阶段关闭`"
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 16px"
    />

    <el-alert
      v-if="record && !isOwner"
      :title="`本场面试由 ${record.interviewer} 负责，你只能查看，不能修改评价`"
      type="warning"
      :closable="false"
      show-icon
      style="margin-bottom: 16px"
    />

    <div v-if="resume" class="card" style="margin-bottom: 16px">
      <el-collapse>
        <el-collapse-item title="学生简历（点击展开，供面试评分参考）" name="resume">
          <el-descriptions :column="4" border size="small">
            <el-descriptions-item label="专业">{{ resume.major }}</el-descriptions-item>
            <el-descriptions-item label="年级">{{ resume.grade }}</el-descriptions-item>
            <el-descriptions-item label="GPA">{{ resume.gpa }}</el-descriptions-item>
            <el-descriptions-item label="每周可投入">{{ resume.selfIntro.match(/每周可[^，。]*/)?.[0] || '-' }}</el-descriptions-item>
          </el-descriptions>
          <div class="resume-block">
            <div class="resume-label">技能</div>
            <el-tag v-for="s in resume.skills" :key="s" size="small" effect="plain" style="margin: 0 6px 6px 0">{{ s }}</el-tag>
          </div>
          <div class="resume-block">
            <div class="resume-label">项目经历</div>
            <div v-for="p in resume.projects" :key="p.name" class="project-item">
              <strong>{{ p.name }}</strong>
              <span class="muted"> · {{ p.role }} · {{ p.desc }}（{{ p.tech }}）</span>
            </div>
          </div>
          <div class="resume-block">
            <div class="resume-label">自我介绍</div>
            <p class="resume-text">{{ resume.selfIntro }}</p>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>

    <div v-if="record" class="card">
      <el-form label-width="110px" label-position="left" :disabled="readOnly">
        <el-form-item v-for="item in dimensions" :key="item.key" :label="item.label">
          <div class="score-row">
            <el-slider v-model="form.scores[item.key]" :min="60" :max="100" :step="1" style="max-width: 420px" />
            <span class="score">{{ form.scores[item.key] }}</span>
            <span class="muted">{{ item.hint }}</span>
          </div>
        </el-form-item>

        <el-form-item label="综合分">
          <strong style="font-size: 20px">{{ total }}</strong>
          <span class="muted" style="margin-left: 10px">按规则开关中的五维权重计算（合计 100）</span>
        </el-form-item>

        <el-form-item label="文字评价">
          <el-input v-model="form.evaluation" type="textarea" :rows="4" placeholder="学习态度、逻辑思维、编程基础、时间投入等" />
        </el-form-item>

        <el-form-item label="录取建议">
          <el-radio-group v-model="form.recommendation">
            <el-radio value="ADMIT">建议拟录取</el-radio>
            <el-radio value="ALTERNATE">建议递补</el-radio>
            <el-radio value="REJECT">不建议录取</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <el-alert
        title="提交后进入本室汇总，拟录取 / 递补名单由组长或教师在「拟录取管理」中统一编排。"
        type="info"
        :closable="false"
        show-icon
      />
    </div>

    <el-empty v-else description="未找到面试记录" />
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import { useInterviewsStore } from '@/stores/interviews'
import { useStageStore } from '@/stores/stage'
import { useClockStore } from '@/stores/clock'
import { isPast } from '@/utils/time'
import { useAuthStore } from '@/stores/auth'
import { students } from '@/mock/students'
import { teacherIdByName } from '@/mock/teachers'
import { useConfigStore } from '@/stores/config'

const route = useRoute()
const router = useRouter()
const interviews = useInterviewsStore()
const stage = useStageStore()
const clock = useClockStore()
const config = useConfigStore()
const auth = useAuthStore()
const evaluationDeadline = computed(() => stage.stages.find((s) => s.no === 4)?.end || '2026-11-03 17:00')
const expired = computed(() => isPast(evaluationDeadline.value, clock.now))
const stageClosed = computed(() => !stage.canWrite(4) || expired.value)
const record = computed(() => interviews.byId(route.params.id))
const initial = interviews.byId(route.params.id)
const isOwner = computed(() => {
  if (!initial) return false
  const myId = teacherIdByName(auth.realName, auth.laboratoryId)
  if (initial.interviewerId) return initial.interviewerId === myId
  return initial.interviewer === auth.realName
})
const resume = computed(() => students.find((s) => s.id === record.value?.studentId)?.resume || null)
const readOnly = computed(() => stageClosed.value || !isOwner.value)

const dimensions = [
  { key: 'attitude', label: '学习态度', hint: '主动性、认真程度、学习意愿' },
  { key: 'logic', label: '逻辑思维', hint: '分析问题、解决问题能力' },
  { key: 'programming', label: '编程基础', hint: '基础知识与实际编程能力' },
  { key: 'timeCommitment', label: '时间投入', hint: '能否保证项目实训时间' },
  { key: 'comprehensive', label: '综合表现', hint: '沟通、团队合作及其他' }
]

const form = reactive({
  scores: {
    attitude: initial?.scores?.attitude ?? 80,
    logic: initial?.scores?.logic ?? 80,
    programming: initial?.scores?.programming ?? 80,
    timeCommitment: initial?.scores?.timeCommitment ?? 80,
    comprehensive: initial?.scores?.comprehensive ?? 80
  },
  evaluation: initial?.evaluation || '',
  recommendation: initial?.recommendation || 'ADMIT'
})

const total = computed(() => {
  const w = config.weights
  const sum = Object.values(w).reduce((a, b) => a + Number(b), 0)
  if (sum !== 100) {
    const values = Object.values(form.scores)
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length)
  }
  return Math.round(
    (form.scores.attitude * w.attitude +
      form.scores.logic * w.logic +
      form.scores.programming * w.programming +
      form.scores.timeCommitment * w.timeCommitment +
      form.scores.comprehensive * w.comprehensive) /
      100
  )
})

function save() {
  if (!record.value) return
  const sum = Object.values(config.weights).reduce((a, b) => a + Number(b), 0)
  if (sum !== 100) {
    ElMessage.error('评分权重合计不等于 100，请先在「规则开关」中调整')
    return
  }
  if (readOnly.value) {
    ElMessage.warning('仅本场面试官可以保存评价')
    return
  }
  if (!form.evaluation.trim()) {
    ElMessage.warning('请填写文字评价')
    return
  }
  const ok = interviews.saveEvaluation(record.value.id, {
    scores: { ...form.scores },
    evaluation: form.evaluation,
    recommendation: form.recommendation,
    weights: { ...config.weights }
  })
  if (!ok) {
    ElMessage.error('保存失败：评分需为 60~100 整数，且建议不能为空')
    return
  }
  ElMessage.success(`已保存：综合分 ${total.value}，建议 ${form.recommendation}`)
  router.push('/teacher/interviews')
}
</script>

<style scoped>
.score-row { display: flex; align-items: center; gap: 14px; width: 100%; }
.score { width: 34px; font-weight: 600; text-align: right; }
.resume-block { margin-top: 12px; }
.resume-label { font-size: 13px; color: var(--trs-muted); margin-bottom: 6px; }
.resume-text { margin: 0; font-size: 13px; line-height: 1.8; }
.project-item { font-size: 13px; line-height: 1.9; }
</style>
