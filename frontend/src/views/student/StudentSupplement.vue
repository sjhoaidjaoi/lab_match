<template>
  <section v-loading="loading" class="student-page" aria-label="补录志愿填报">

    <el-card shadow="never" class="round-card">
      <div class="round-head">
        <div>
          <p class="round-title">
            <template v-if="view?.round?.open">第 {{ view.round.open }} 轮补录报名中</template>
            <template v-else>当前没有开放补录轮次</template>
          </p>
          <p class="round-desc">
            第一轮录取结束后，学院公布各实训室剩余名额，未录取同学可在此重新填报志愿，
            由实训室统一组织面试。三轮补录后剩余名额进入全院调剂池统一安排。
          </p>
        </div>
        <el-tag v-if="view?.round?.open" type="success" effect="light">
          {{ roundLabel(view.round.open) }}
        </el-tag>
      </div>
    </el-card>

    <el-alert
      v-if="view?.placed"
      type="success"
      :closable="false"
      show-icon
      :title="`你已被「${view.placedLaboratoryName || '实训室'}」录取`"
      description="已被录取的同学无需再填报补录志愿，可前往「最终结果」查看录取结果。"
    />

    <template v-else-if="openRound">
      <el-row :gutter="12" class="lab-grid">
        <el-col v-for="lab in surplusLabs" :key="lab.id" :xs="24" :sm="12" :lg="8">
          <el-card shadow="never" class="lab-card">
            <div class="lab-head">
              <span class="lab-name">{{ lab.name }}</span>
              <el-tag type="warning" effect="light" size="small">剩余 {{ lab.remaining }}</el-tag>
            </div>
            <p class="lab-sub">{{ lab.researchDirection || lab.college || '—' }}</p>
            <p class="lab-sub">计划名额 {{ lab.plan }} · 可报导师 {{ lab.teachers.length }} 位</p>
            <div class="teacher-chips">
              <el-tag v-for="teacher in lab.teachers.slice(0, 4)" :key="teacher.id" size="small" effect="plain">
                {{ teacher.name }}
              </el-tag>
            </div>
          </el-card>
        </el-col>
      </el-row>
      <el-empty :image-size="88" v-if="!surplusLabs.length" description="目前没有仍有余量的实训室" />

      <el-card v-if="!submitted" shadow="never" class="form-card">
        <h2 class="form-title">填报志愿（最多 3 个）</h2>
        <el-form label-width="90px">
          <el-form-item v-for="(choice, index) in choices" :key="index">
            <template #label>志愿 {{ index + 1 }}</template>
            <div class="choice-row">
              <el-select
                v-model="choice.laboratoryId"
                placeholder="选择实训室"
                clearable
                class="choice-lab"
                @change="() => onLabChange(choice)"
              >
                <el-option v-for="lab in surplusLabs" :key="lab.id" :label="`${lab.name}（剩余 ${lab.remaining}）`" :value="lab.id" />
              </el-select>
              <el-select v-model="choice.labTeacherId" placeholder="选择导师" clearable class="choice-teacher"
                :disabled="!choice.laboratoryId">
                <el-option
                  v-for="teacher in teachersOf(choice.laboratoryId)"
                  :key="teacher.id"
                  :label="teacher.name"
                  :value="teacher.id"
                />
              </el-select>
              <el-button link type="danger" @click="clearChoice(index)">清空</el-button>
            </div>
          </el-form-item>
          <el-form-item label="调剂意愿">
            <div class="obey-row">
              <el-checkbox v-model="obeyInternal">服从实训室内部调剂</el-checkbox>
              <el-checkbox v-model="obeyCollege">服从全院跨实训室调剂</el-checkbox>
            </div>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="saving" :disabled="!validChoices.length" @click="submit">
              提交补录志愿
            </el-button>
            <span class="hint">请至少完整填写一个志愿（实训室 + 导师）</span>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card v-else shadow="never" class="form-card">
        <el-result icon="success" title="本轮补录志愿已提交"
          :sub-title="`第 ${view?.round?.open} 轮志愿已进入实训室审核，请留意面试通知与站内消息。`" />
        <div class="submitted-list">
          <div v-for="item in currentRoundChoices" :key="item.id" class="submitted-item">
            <span>{{ roundLabel(item.round) }}</span>
            <strong>{{ item.laboratoryName }}</strong>
            <el-tag size="small" effect="plain">已提交</el-tag>
          </div>
        </div>
      </el-card>

      <el-card v-if="historyChoices.length" shadow="never" class="form-card">
        <h2 class="form-title">历史填报记录</h2>
        <el-table :data="historyChoices" size="small">
          <el-table-column label="轮次" width="120">
            <template #default="{ row }">{{ roundLabel(row.round) }}</template>
          </el-table-column>
          <el-table-column prop="laboratoryName" label="实训室" min-width="180" />
          <el-table-column label="提交时间" width="180">
            <template #default="{ row }">{{ formatTime(row.submittedAt) }}</template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>

    <el-card v-else shadow="never">
      <el-result
        icon="info"
        title="当前没有开放的补录轮次"
        sub-title="第一轮录取结束后，学院会公布各实训室剩余名额并开启补录，请留意站内消息。"
      />
    </el-card>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { allocationApi, type MySupplementView, type TeacherQuota } from '@/api/allocation'

const loading = ref(false)
const saving = ref(false)
const view = ref<MySupplementView | null>(null)

const choices = reactive([
  { laboratoryId: null as number | null, labTeacherId: null as number | null },
  { laboratoryId: null as number | null, labTeacherId: null as number | null },
  { laboratoryId: null as number | null, labTeacherId: null as number | null }
])
const obeyInternal = ref(true)
const obeyCollege = ref(true)

const openRound = computed(() => view.value?.round?.open ?? null)
const surplusLabs = computed(() => view.value?.labs || [])
const currentRoundChoices = computed(() =>
  (view.value?.choices || []).filter((item) => item.round === openRound.value && item.status === 'SUBMITTED'))
const historyChoices = computed(() =>
  (view.value?.choices || []).filter((item) => item.round !== openRound.value))
const submitted = computed(() => currentRoundChoices.value.length > 0)

const validChoices = computed(() =>
  choices.filter((item) => item.laboratoryId && item.labTeacherId) as Array<{ laboratoryId: number; labTeacherId: number }>)

function teachersOf(laboratoryId: number | null): TeacherQuota[] {
  if (!laboratoryId) return []
  const lab = surplusLabs.value.find((item) => item.id === laboratoryId)
  return lab?.teachers || []
}

function roundLabel(round?: number | null) {
  if (!round) return '—'
  const labels: Record<number, string> = { 1: '第一轮', 2: '第二轮补录', 3: '第三轮补录' }
  return labels[round] || `第 ${round} 轮`
}

function formatTime(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function onLabChange(choice: { laboratoryId: number | null; labTeacherId: number | null }) {
  choice.labTeacherId = null
}

function clearChoice(index: number) {
  choices[index].laboratoryId = null
  choices[index].labTeacherId = null
}

async function load() {
  loading.value = true
  try {
    view.value = await allocationApi.mySupplement()
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!validChoices.value.length) return
  const unique = new Set(validChoices.value.map((item) => item.laboratoryId))
  if (unique.size !== validChoices.value.length) {
    ElMessage.warning('同一个实训室只能填报一次')
    return
  }
  const agreed = await ElMessageBox.confirm(
    `本轮可填报 ${validChoices.value.length} 个志愿，提交后在下一轮开始前不能修改。确定提交？`,
    '提交补录志愿', { type: 'warning' }
  ).then(() => true, () => false)
  if (!agreed) return
  saving.value = true
  try {
    await allocationApi.submitSupplement({
      choices: validChoices.value.map((item) => ({ laboratoryId: item.laboratoryId, labTeacherId: item.labTeacherId })),
      obeyInternalAdjustment: obeyInternal.value,
      obeyCollegeAdjustment: obeyCollege.value
    })
    ElMessage.success('补录志愿已提交')
    await load()
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.round-card { margin-bottom: 12px; }
.round-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.round-title { font-size: 15px; font-weight: 600; margin: 0 0 4px; }
.round-desc { color: var(--lm-text-secondary); font-size: 12.5px; line-height: 1.7; margin: 0; }
.lab-grid { margin-bottom: 4px; }
.lab-card { margin-bottom: 12px; }
.lab-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.lab-name { font-weight: 600; }
.lab-sub { color: var(--lm-text-secondary); font-size: 12.5px; margin: 6px 0 0; }
.teacher-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
.form-card { margin-top: 12px; }
.form-title { font-size: 15px; font-weight: 600; margin: 0 0 16px; }
.choice-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.choice-lab { width: 240px; }
.choice-teacher { width: 180px; }
.obey-row { display: flex; gap: 20px; flex-wrap: wrap; }
.hint { margin-left: 12px; color: var(--lm-text-secondary); font-size: 12.5px; }
.submitted-list { display: flex; flex-direction: column; gap: 8px; }
.submitted-item { display: flex; align-items: center; gap: 12px; font-size: 13px; }
</style>
