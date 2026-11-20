<template>
  <section v-loading="loading" class="student-page">
    <h1>最终结果与公示</h1>
    <el-empty v-if="!loading && !published" description="最终录取结果尚未公示" />
    <template v-else>
      <el-card shadow="never">
        <h2>学院录取公示</h2>
        <template v-if="publication">
          <p>公示标题 · {{ publication.title }}</p>
          <p v-if="publication.content">公示内容 · {{ publication.content }}</p>
          <p>公示时间 · {{ formatDateTime(publication.startAt) }} 至 {{ formatDateTime(publication.endAt) }}</p>
        </template>
        <p v-else>暂无公示信息</p>
        <dl v-if="finalResult" class="student-fields">
          <dt>学生姓名</dt><dd>{{ auth.user?.realName || '—' }}</dd>
          <dt>录取实训室</dt><dd>{{ finalResult.laboratoryName || '—' }}</dd>
          <dt>指导教师</dt><dd>{{ finalResult.labTeacherName || '尚未记录' }}</dd>
          <dt>录取状态</dt><dd>
            <el-tag :type="finalStatus === 'ENROLLED' ? 'success' : 'warning'">{{ finalStatusLabel }}</el-tag>
          </dd>
          <dt>确认时间</dt><dd>{{ formatDateTime(finalResult.confirmedAt) }}</dd>
        </dl>
        <el-empty v-else description="本批次未查询到录取记录。如有疑问，请通过学院公布的渠道咨询。" />
        <div v-if="inPublicity" class="student-actions">
          <el-button type="primary" @click="openDialog">提交异议</el-button>
        </div>
        <p v-else-if="publication">当前不在公示期内，无法提交异议。</p>
      </el-card>
      <el-card shadow="never">
        <h2>我的异议</h2>
        <el-empty v-if="!objections.length" description="暂无异议记录" />
        <div v-else class="student-grid">
          <el-card v-for="item in objections" :key="item.id" shadow="never">
            <h2>{{ objectionTypeLabel(item.type) }}</h2>
            <p>{{ item.content }}</p>
            <p>提交时间 · {{ formatDateTime(item.createdAt) }}</p>
            <p>处理状态 · <el-tag :type="objectionTag(item.status)">{{ objectionStatusLabel(item.status) }}</el-tag></p>
            <p v-if="item.handlingNote">处理说明 · {{ item.handlingNote }}</p>
          </el-card>
        </div>
      </el-card>
    </template>
    <el-dialog v-model="dialogVisible" title="提交公示异议" width="520px">
      <el-form label-position="top">
        <el-form-item label="异议类型">
          <el-select v-model="form.type" placeholder="请选择异议类型" style="width: 100%">
            <el-option label="录取结果" value="ADMISSION_RESULT" />
            <el-option label="调剂结果" value="ADJUSTMENT_RESULT" />
            <el-option label="公示信息" value="PUBLICATION_INFO" />
            <el-option label="其他" value="OTHER" />
          </el-select>
        </el-form-item>
        <el-form-item label="异议内容">
          <el-input v-model="form.content" type="textarea" :rows="5" maxlength="500" show-word-limit
            placeholder="请描述具体异议内容" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitObjection">提交</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import type { PublicationInfo } from '@/types'
import {
  formatDateTime, studentApi, type PublicationObjection, type StudentFinalResult
} from '@/api/student'

const loading = ref(false)
const auth = useAuthStore()
const submitting = ref(false)
const dialogVisible = ref(false)
const finalResult = ref<StudentFinalResult | null>(null)
const publication = ref<PublicationInfo | null>(null)
const objections = ref<PublicationObjection[]>([])
const form = reactive({ type: '', content: '' })

const finalStatus = computed(() => finalResult.value?.finalStatus ?? '')
const finalStatusLabel = computed(() => {
  if (finalStatus.value === 'ADMITTED') return '已录取'
  if (finalStatus.value === 'ENROLLED') return '已入组'
  return finalStatus.value || '—'
})
const published = computed(() => publication.value?.status === 'PUBLISHED' && Date.parse(publication.value.startAt) <= Date.now())
const inPublicity = computed(() => {
  const pub = publication.value
  if (!pub || !pub.startAt || !pub.endAt) return false
  const now = Date.now()
  return new Date(pub.startAt).getTime() <= now && now <= new Date(pub.endAt).getTime()
})

function objectionTypeLabel(type: string) {
  const labels: Record<string, string> = {
    ADMISSION_RESULT: '录取结果异议', ADJUSTMENT_RESULT: '调剂结果异议',
    PUBLICATION_INFO: '公示信息异议', OTHER: '其他异议'
  }
  return labels[type] ?? type
}
function objectionStatusLabel(status: string) {
  const labels: Record<string, string> = { PENDING: '待处理', ACCEPTED: '已受理', REJECTED: '已驳回' }
  return labels[status] ?? status
}
function objectionTag(status: string) {
  if (status === 'ACCEPTED') return 'success'
  if (status === 'PENDING') return 'warning'
  return 'info'
}

async function load() {
  loading.value = true
  const results = await Promise.allSettled([
    studentApi.myFinal(), studentApi.publication(), studentApi.myObjections()
  ])
  if (results[0].status === 'fulfilled') finalResult.value = results[0].value
  else console.error('最终结果读取失败', results[0].reason)
  if (results[1].status === 'fulfilled') publication.value = results[1].value
  else console.error('公示信息读取失败', results[1].reason)
  if (results[2].status === 'fulfilled') objections.value = results[2].value
  else console.error('异议记录读取失败', results[2].reason)
  loading.value = false
}

function openDialog() {
  form.type = ''
  form.content = ''
  dialogVisible.value = true
}

async function submitObjection() {
  if (submitting.value) return
  if (!form.type || !form.content.trim()) {
    ElMessage.warning('请选择异议类型并填写异议内容')
    return
  }
  submitting.value = true
  try {
    await studentApi.submitObjection({ type: form.type, content: form.content.trim() })
    ElMessage.success('异议已提交')
    dialogVisible.value = false
    objections.value = await studentApi.myObjections()
  } catch (error) {
    console.error('异议提交失败', error)
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>
