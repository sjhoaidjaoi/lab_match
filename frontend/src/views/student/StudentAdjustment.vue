<template>
  <section v-loading="loading" class="student-page adjustment-page">
    <header class="page-header">
      <p class="kicker">录取与结果 · 第 7 阶段</p>
      <h1>统筹调剂结果</h1>
      <p class="page-desc">第三轮结束后，学院按你最近一次填报的意愿办理安置：先由实训室内部消化，再进行全院跨室调剂。</p>
    </header>

    <div class="adjust-bar">
      <el-radio-group v-model="stage" aria-label="调剂类型">
        <el-radio-button :value="6">实训室内部调剂</el-radio-button>
        <el-radio-button :value="7">全院跨室调剂</el-radio-button>
      </el-radio-group>
      <div class="adjust-facts">
        <span v-if="preference" class="adjust-fact">
          <em>我的调剂意愿</em>
          <b :class="obeyed ? 'is-yes' : 'is-no'">{{ obeyed ? '服从' : '不服从' }}</b>
        </span>
        <span v-if="currentStage" class="adjust-fact">
          <em>批次当前阶段</em><b>{{ currentStage }}</b>
        </span>
      </div>
    </div>

    <el-alert v-if="failed" title="调剂数据读取失败" type="error" :closable="false">
      <el-button text @click="load">重试</el-button>
    </el-alert>

    <div v-else-if="!loading && !visible.length" class="adjust-empty">
      <span class="adjust-empty__mark" aria-hidden="true">—</span>
      <h2>{{ stage === 6 ? '暂无实训室内部调剂结果' : '暂无全院跨室调剂结果' }}</h2>
      <p>{{ stage === 6 ? '如果本室未产生内部调剂，名额会进入全院调剂池继续匹配。' : '全院调剂在第三轮补录结束后统一办理，结果会同步到这里。' }}</p>
    </div>

    <article v-for="item in visible" :key="item.id" class="result-card" :data-status="item.status">
      <header class="result-card__head">
        <div class="result-card__id">
          <p class="result-card__eyebrow">接收实训室</p>
          <h2>{{ item.targetLabName || '实训室#' + item.targetLaboratoryId }}</h2>
          <p class="result-card__teacher">
            指导教师
            <strong>{{ item.targetTeacherName || '由实训室统筹安排' }}</strong>
          </p>
        </div>
        <span class="status-pill" :data-status="item.status">
          <i aria-hidden="true"></i>
          {{ item.requiresConsent && item.status === 'PENDING' ? '待本人答复' : statusLabel(item.status) }}
        </span>
      </header>

      <dl class="result-grid">
        <div><dt>调剂类型</dt><dd>{{ typeLabel(item.adjustmentType) }}</dd></div>
        <div><dt>通知时间</dt><dd><time>{{ formatDateTime(item.createdAt) }}</time></dd></div>
        <div v-if="item.sourceLabName && item.sourceLabName !== item.targetLabName"><dt>来源实训室</dt><dd>{{ item.sourceLabName }}</dd></div>
        <div><dt>处理结果</dt><dd>{{ statusLabel(item.status) }}</dd></div>
      </dl>

      <p v-if="item.reason" class="result-note">
        <span>调剂说明</span>
        <em>{{ item.reason }}</em>
      </p>

      <div v-if="item.requiresConsent && item.status === 'PENDING'" class="student-actions">
        <el-button type="primary" :disabled="responding" @click="respond(item, true)">接受安置方案</el-button>
        <el-button :disabled="responding" @click="respond(item, false)">拒绝方案</el-button>
        <span class="action-hint">答复后不可撤回，放弃的名额将按顺位补位。</span>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { allocationApi } from '@/api/allocation'
import type { PreferenceItem } from '@/types'
import { formatDateTime, studentApi, type StudentAdjustmentRecord } from '@/api/student'

const route = useRoute()
const selectedStage = ref<number>()
watch(() => route.query.stage, value => {
  selectedStage.value = value === '6' ? 6 : value === '7' ? 7 : undefined
}, { immediate: true })
const records = ref<StudentAdjustmentRecord[]>([])
const stage = computed({
  get() {
    if (selectedStage.value) return selectedStage.value
    const latest = [...records.value].sort((a, b) => b.id - a.id)[0]
    return latest && latest.adjustmentType !== 'INTERNAL' ? 7 : 6
  },
  set(value: number) { selectedStage.value = value }
})
const preference = ref<PreferenceItem>()
const currentStage = ref('')
const failed = ref(false)
const obeyed = computed(() => {
  if (!preference.value) return false
  return stage.value === 6 ? preference.value.obeyInternalAdjustment : preference.value.obeyCollegeAdjustment
})

const loading = ref(false)


const visible = computed(() => {
  if (stage.value === 6) return records.value.filter((item) => item.adjustmentType === 'INTERNAL')
  return records.value.filter((item) => item.adjustmentType === 'CROSS_LAB' || item.adjustmentType === 'MANUAL_PLACEMENT')
})

function typeLabel(type: string) {
  const labels: Record<string, string> = {
    INTERNAL: '实训室内部调剂', CROSS_LAB: '跨实训室调剂', MANUAL_PLACEMENT: '沟通安置'
  }
  return labels[type] ?? type
}
function statusLabel(status: string) {
  const labels: Record<string, string> = { PENDING: '历史待办，待学院统筹', CONFIRMED: '已落实', REJECTED: '已拒绝' }
  return labels[status] ?? status
}
async function load() {
  loading.value = true
  try {
    const [items, choices, batch] = await Promise.all([studentApi.myAdjustments(), studentApi.myPreferences(), studentApi.batchesCurrent()])
    records.value = items
    preference.value = choices.filter(row => row.status === 'SUBMITTED').sort((a, b) => (b.round || 1) - (a.round || 1))[0]
    currentStage.value = batch?.currentStage?.name ?? ''
    failed.value = false
  } catch (error) {
    failed.value = true
  } finally {
    loading.value = false
  }
}

const responding = ref(false)
async function respond(item: StudentAdjustmentRecord, accept: boolean) {
  if (responding.value) return
  responding.value = true
  try {
    const action = accept ? '接受' : '拒绝'
    const confirmed = await ElMessageBox.confirm(`确定${action}「${item.targetLabName}」的安置方案？`, '答复安置方案').then(() => true, () => false)
    if (!confirmed) return
    await allocationApi.respondToProposal(item.id, accept)
    ElMessage.success('答复已提交')
    await load()
  } finally { responding.value = false }
}
onMounted(load)
</script>

<style scoped>
/* 调剂结果原本是一条条裁切线，读完不知道「重点在哪」。
   这里改成一张有主体、有事实区、有结论的安置单：左侧色轨随状态变化。 */
.adjustment-page { gap: 20px; }

.adjust-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 20px;
  padding: 12px 16px;
  border: 1px solid #eee6da;
  border-radius: 14px;
  background: linear-gradient(180deg, #fffdfa, #fbf6ee);
}
.adjust-facts { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 22px; }
.adjust-fact { display: inline-flex; align-items: baseline; gap: 8px; font-size: 13px; }
.adjust-fact em { color: #8b857c; font-style: normal; font-size: 12px; }
.adjust-fact b { color: #26292c; font-weight: 680; }
.adjust-fact b.is-yes { color: #2f6b4a; }
.adjust-fact b.is-no { color: #a33a1d; }

/* 空态：不用 el-empty 的灰字，改成一条有说明的版面 */
.adjust-empty {
  display: grid;
  gap: 6px;
  justify-items: start;
  padding: clamp(28px, 5vw, 52px) clamp(20px, 4vw, 40px);
  border: 1px dashed #e4d8c6;
  border-radius: 18px;
  background: linear-gradient(150deg, #fffdfa, #fbf5eb);
}
.adjust-empty__mark { color: #d9a778; font-size: 26px; line-height: 1; letter-spacing: .2em; }
.adjust-empty h2 { margin: 4px 0 0; font-size: 18px; font-weight: 700; color: #1f2225; }
.adjust-empty p { margin: 0; max-width: 56ch; color: #7a736a; font-size: 13.5px; line-height: 1.7; }

.result-card {
  position: relative;
  overflow: hidden;
  padding: clamp(20px, 2.6vw, 30px) clamp(20px, 2.8vw, 34px);
  border: 1px solid #eae1d3;
  border-radius: 18px;
  background: #fffefc;
  box-shadow: 0 1px 1px rgba(66, 45, 28, .035), 0 14px 34px -28px rgba(66, 45, 28, .4);
}
.result-card::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: linear-gradient(180deg, #c9450b, #ef7a2c);
}
.result-card[data-status="CONFIRMED"]::before { background: linear-gradient(180deg, #2f6b4a, #74a98a); }
.result-card[data-status="REJECTED"]::before { background: linear-gradient(180deg, #8d8a84, #bcb6ac); }

.result-card__head { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 16px 24px; }
.result-card__eyebrow {
  margin: 0;
  color: #8b857c;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: .14em;
}
.result-card__id h2 {
  margin: 6px 0 0;
  color: #17191c;
  font-size: clamp(24px, 2.3vw, 32px);
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -.03em;
}
.result-card__teacher { margin: 8px 0 0; color: #6d665d; font-size: 13.5px; }
.result-card__teacher strong { color: #2a2d30; font-weight: 680; }

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 13px 5px 11px;
  border: 1px solid #e7dccd;
  border-radius: 999px;
  background: #fffdf9;
  color: #6d665d;
  font-size: 12.5px;
  font-weight: 640;
  white-space: nowrap;
}
.status-pill i { width: 7px; height: 7px; border-radius: 50%; background: currentColor; box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 14%, transparent); }
.status-pill[data-status="CONFIRMED"] { border-color: #cfe4d8; background: #f4faf6; color: #2f6b4a; }
.status-pill[data-status="PENDING"] { border-color: #f0d9bf; background: #fff8ef; color: #a8621f; }

.result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 168px), 1fr));
  gap: 16px 24px;
  margin: 22px 0 0;
  padding: 16px 18px;
  border: 1px solid #f0e8dc;
  border-radius: 14px;
  background: #fdf9f3;
}
.result-grid dt { color: #8b857c; font-size: 11.5px; letter-spacing: .08em; }
.result-grid dd { margin: 6px 0 0; color: #23262a; font-size: 14.5px; font-weight: 640; overflow-wrap: anywhere; }

.result-note {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 14px;
  margin: 16px 0 0;
  color: #4f4a44;
  font-size: 13.5px;
  line-height: 1.7;
}
.result-note span { flex: none; color: #8b857c; font-size: 11.5px; font-weight: 600; letter-spacing: .12em; }
.result-note em { font-style: normal; }

.student-actions { align-items: center; margin-top: 20px; padding-top: 18px; border-top: 1px solid #f0e8dc; }
.action-hint { color: #918a80; font-size: 12.5px; }

@media (max-width: 640px) {
  .adjust-bar { padding: 10px 12px; }
  .result-grid { padding: 14px; }
}
</style>
