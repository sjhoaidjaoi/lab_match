<template>
  <section v-loading="loading" class="student-page">
    <header class="page-header">
      <h1>意向填报</h1>
      <p v-if="batch">{{ batch.batchName }}</p>
    </header>
    <el-alert v-if="loadError" title="填报数据加载失败，请重新加载" type="error" :closable="false"><el-button text @click="load">重试</el-button></el-alert>
    <el-alert v-if="!record && !open" type="info" show-icon :closable="false" :title="windowHint" />
    <el-card v-if="!record && !preferences.length" shadow="never">
      <h2>平行志愿</h2>
      <p>最多选择三个不同的实训室，志愿之间没有优先级。</p>
      <p v-if="preferenceDeadline">填报截止 {{ formatDateTime(preferenceDeadline) }}</p>
      <p><RouterLink to="/student/announcement">查看各实训室项目及招新要求</RouterLink></p>
      <fieldset v-for="(choice, index) in draft.choices" :key="index" class="student-preference">
        <legend>平行志愿 {{ index + 1 }}</legend>
        <el-select v-model="choice.laboratoryId" clearable filterable placeholder="选择实训室" aria-label="实训室"
          :disabled="!open || saving" @change="selectLab(choice)">
          <el-option v-for="lab in labs" :key="lab.id" :value="lab.id" :label="lab.name"
            :disabled="draft.choices.some(other => other !== choice && other.laboratoryId === lab.id)" />
        </el-select>
        <el-select v-model="choice.labTeacherId" placeholder="选择指导教师" aria-label="指导教师"
          :disabled="!open || saving || !choice.laboratoryId" :loading="choice.loading">
          <el-option v-for="teacher in choice.teachers" :key="teacher.id" :value="teacher.id" :label="teacher.name" />
        </el-select>
        <small v-if="choice.hint">{{ choice.hint }}</small>
      </fieldset>
      <el-form label-position="top" class="student-actions">
        <el-form-item label="是否服从实训室内部调剂">
          <el-radio-group v-model="draft.internal" :disabled="!open || saving">
            <el-radio :value="true">服从</el-radio>
            <el-radio :value="false">不服从</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="是否服从学院跨实训室调剂">
          <el-radio-group v-model="draft.college" :disabled="!open || saving">
            <el-radio :value="true">服从</el-radio>
            <el-radio :value="false">不服从</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <fieldset class="student-preference">
        <legend>个人简历（必填）</legend>
        <label>选择或更换简历（PDF、DOC、DOCX，10 MB 以内）
          <input type="file" accept=".pdf,.doc,.docx" :disabled="!open || saving || uploading" @change="uploadResume" />
        </label>
        <p>{{ uploading ? '正在上传…' : resume?.name || '尚未上传' }}</p>
      </fieldset>
      <el-button type="primary" :disabled="!open || !resume || uploading" :loading="saving" @click="submit">
        提交志愿
      </el-button>
    </el-card>
    <el-card shadow="never">
      <h2>提交回执</h2>
      <template v-if="preferences.length">
        <ul class="student-list">
          <li v-for="item in preferences" :key="item.id">{{ item.laboratoryName || '实训室#' + item.laboratoryId }} · {{ item.labTeacherName || '未记录导师' }}</li>
        </ul>
        <p>内部调剂 · {{ preferences[0].obeyInternalAdjustment ? '服从' : '不服从' }}</p>
        <p>跨实训室调剂 · {{ preferences[0].obeyCollegeAdjustment ? '服从' : '不服从' }}</p>
        <p>提交时间 · {{ formatDateTime(preferences[0].submittedAt) }}</p>
        <p>个人简历 · <el-button v-if="preferences[0].resume" link type="primary" @click="downloadResume(preferences[0].resume)">{{ preferences[0].resume.name }} · 下载</el-button><span v-else>未上传</span></p>
      </template>
      <el-empty v-else description="暂无提交记录" />
      <RouterLink v-if="record" to="/student/application">前往意向填报</RouterLink>
    </el-card>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { recruitmentApi, type Resume } from '@/api/recruitment'
import type { LabView, PreferenceItem } from '@/types'
import { formatDateTime, studentApi, type CurrentBatch, type LabTeacher } from '@/api/student'

defineProps<{ record?: boolean }>()

const loading = ref(false)
const saving = ref(false)
const resume = ref<Resume | null>(null)
const uploading = ref(false)

async function uploadResume(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !open.value || saving.value || uploading.value) return
  if (!/\.(pdf|docx?)$/i.test(file.name) || !file.size || file.size > 10 * 1024 * 1024) {
    ElMessage.warning('请选择 10 MB 以内的 PDF、DOC 或 DOCX')
    return
  }
  uploading.value = true
  try { resume.value = await recruitmentApi.upload(file) }
  catch { /* 请求层显示失败原因。 */ }
  finally { uploading.value = false }
}

function downloadResume(item: Resume) {
  void recruitmentApi.download(item).catch(() => undefined)
}
const loadError = ref(false)
const batch = ref<CurrentBatch | null>(null)
const labs = ref<LabView[]>([])
const preferences = ref<PreferenceItem[]>([])
interface Choice {
  laboratoryId?: number
  labTeacherId?: number
  teachers: LabTeacher[]
  loading: boolean
  hint: string
}
const draft = reactive({
  choices: Array.from({ length: 3 }, (): Choice => ({ teachers: [], loading: false, hint: '' })),
  internal: null as boolean | null,
  college: null as boolean | null
})

const open = computed(() => !loading.value && !loadError.value && !preferences.value.length && batch.value?.currentStage?.key === 'PREFERENCE')
const preferenceDeadline = computed(() => {
  const stage = batch.value?.stages?.find((item) => item.stageKey === 'PREFERENCE')
  return stage?.endTime ?? null
})
const windowHint = computed(() => {
  const stage = batch.value?.currentStage
  if (!stage) return '当前不在志愿填报窗口'
  if (stage.no < 3) return '志愿填报尚未开始'
  if (stage.no > 3) return '志愿填报已结束，志愿已锁定'
  return '当前不在志愿填报窗口'
})

async function selectLab(choice: Choice) {
  choice.labTeacherId = undefined
  choice.teachers = []
  choice.hint = ''
  const id = choice.laboratoryId
  choice.loading = Boolean(id)
  if (!id) return
  try {
    const detail = await studentApi.labDetail(id)
    if (choice.laboratoryId !== id) return
    choice.teachers = (detail.teachers ?? []).filter(teacher => teacher.acceptsPreferences)
    if (!choice.teachers.length) choice.hint = '该实训室暂无可选导师'
  } catch {
    if (choice.laboratoryId === id) choice.hint = '导师加载失败，请重新选择实训室'
  } finally {
    if (choice.laboratoryId === id) choice.loading = false
  }
}

async function load() {
  loading.value = true
  const results = await Promise.allSettled([studentApi.labs(), studentApi.myPreferences(), studentApi.batchesCurrent(), recruitmentApi.draft()])
  if (results[3].status === 'fulfilled') resume.value = results[3].value
  loadError.value = results.some(result => result.status === 'rejected')
  if (results[0].status === 'fulfilled') labs.value = results[0].value
  else console.error('实训室读取失败', results[0].reason)
  if (results[1].status === 'fulfilled') {
    preferences.value = results[1].value
  } else console.error('志愿读取失败', results[1].reason)
  if (results[2].status === 'fulfilled') batch.value = results[2].value
  else console.error('批次读取失败', results[2].reason)
  loading.value = false
}

async function submit() {
  if (!open.value || saving.value || uploading.value || !resume.value) return
  const resumeId = resume.value.id
  const choices = draft.choices.flatMap(({ laboratoryId, labTeacherId }) =>
    laboratoryId && labTeacherId ? [{ laboratoryId, labTeacherId }] : [])
  if (!choices.length || draft.choices.some(choice => choice.laboratoryId && !choice.labTeacherId)) {
    ElMessage.warning('请至少填写一个完整志愿，并为所选实训室选择指导教师')
    return
  }
  if (draft.internal === null || draft.college === null) {
    ElMessage.warning('请分别选择两项调剂意愿')
    return
  }
  saving.value = true
  try {
    const accepted = await ElMessageBox.confirm('每批次只能提交一次，提交后无法自行修改。确认提交？', '确认提交志愿', { type: 'warning' }).then(() => true, () => false)
    if (!accepted) return
    const result = await studentApi.submitPreferences({
      resumeId,
      choices,
      obeyInternalAdjustment: draft.internal,
      obeyCollegeAdjustment: draft.college
    })
    ElMessage.success(`志愿已提交（共 ${result.count} 个平行志愿）`)
    await load()
  } catch (error) {
    console.error('志愿提交失败', error)
    await load()
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>
