<template>
  <section v-loading="loading" class="student-page">
    <h1>拟录取确认</h1>
    <p v-if="pendingList.length > 1">收到多个拟录取通知时，只能确认一个实训室；确认后其余待确认名额将自动释放。</p>
    <el-empty v-if="!loading && !intended.length" description="暂无拟录取通知" />
    <div v-else class="student-grid">
      <el-card v-for="item in intended" :key="item.id" shadow="never">
        <h2>{{ item.laboratoryName || '实训室#' + item.laboratoryId }}</h2>
        <p v-if="item.source === 'TEACHER_INVITATION'">面试通过 · 入组邀请</p>
        <p>录取状态 · <el-tag :type="tagType(item.status)">{{ statusLabel(item) }}</el-tag></p>
        <p v-if="item.labTeacherName">指导教师 · {{ item.labTeacherName }}</p>
        <p v-if="item.confirmationDeadline">确认截止 · {{ formatDateTime(item.confirmationDeadline) }}</p>
        <p v-if="item.confirmedAt">处理时间 · {{ formatDateTime(item.confirmedAt) }}</p>
        <div v-if="item.status === 'PENDING'" class="student-actions">
          <el-button type="primary" :loading="savingId === item.id" @click="decide(item, true)">{{ item.source === 'TEACHER_INVITATION' ? '接受邀请' : '确认录取' }}</el-button>
          <el-button :loading="savingId === item.id" @click="decide(item, false)">放弃</el-button>
        </div>
      </el-card>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatDateTime, studentApi, type StudentAdmission } from '@/api/student'

const loading = ref(false)
const savingId = ref<number | null>(null)
const admissions = ref<StudentAdmission[]>([])

const intended = computed(() => admissions.value.filter((item) => item.admissionType === 'INTENDED'))
const pendingList = computed(() => intended.value.filter((item) => item.status === 'PENDING'))

function statusLabel(item: StudentAdmission) {
  if (item.status === 'PENDING') return '待确认'
  if (item.status === 'CONFIRMED') return item.autoConfirmed ? '已自动确认' : '已确认'
  if (item.status === 'REJECTED') return '已放弃'
  if (item.status === 'EXPIRED') return '逾期未确认'
  return item.status
}
function tagType(status: string) {
  if (status === 'CONFIRMED') return 'success'
  if (status === 'PENDING') return 'warning'
  return 'info'
}

async function load() {
  loading.value = true
  try {
    admissions.value = await studentApi.myAdmissions()
  } catch (error) {
    console.error('拟录取读取失败', error)
  } finally {
    loading.value = false
  }
}

async function decide(item: StudentAdmission, confirmed: boolean) {
  if (savingId.value !== null) return
  const name = item.laboratoryName || '该实训室'
  const message = confirmed
    ? `确认加入「${name}」？确认后，其余待确认拟录取名额将自动释放。`
    : `确认放弃「${name}」的拟录取意向？`
  const agreed = await ElMessageBox.confirm(message, confirmed ? '确认录取' : '放弃录取', {
    type: confirmed ? 'warning' : 'info'
  }).then(() => true, () => false)
  if (!agreed) return
  savingId.value = item.id
  try {
    await studentApi.confirmAdmission(item.id, confirmed)
    ElMessage.success(confirmed ? '录取已确认' : '已放弃该拟录取意向')
    await load()
  } catch (error) {
    console.error('拟录取确认失败', error)
  } finally {
    savingId.value = null
  }
}

onMounted(load)
</script>
