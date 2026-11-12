<template>
  <section class="student-page">
    <h1>{{ stage === 6 ? '分轮补录 · 实训室内部调剂' : '学院统筹调剂' }}</h1>
    <el-card shadow="never">
      <h2>我的调剂意愿</h2>
      <p>实训室内部调剂 · {{ intention(student.receipt?.internal) }}</p>
      <p>学院跨实训室调剂 · {{ intention(student.receipt?.college) }}</p>
    </el-card>
    <el-card v-if="visibleLab" shadow="never">
      <h2>{{ labName(visibleLab) }}</h2>
      <p>确认截止 {{ formatTime(student.timeline[stage - 1].end) }}</p>
      <p>处理结果 · {{ decision ? (decision.accepted ? '已接受' : '已拒绝') : student.currentNumber === stage ? '待确认' : '逾期未确认' }}</p>
      <div v-if="!decision && student.currentNumber === stage" class="student-actions">
        <el-button type="primary" @click="confirm(true)">接受调剂</el-button>
        <el-button @click="confirm(false)">拒绝调剂</el-button>
      </div>
    </el-card>
    <el-empty v-else :description="student.confirmed ? '已确认录取去向，暂无待处理调剂' : '暂无个人调剂通知'" />
    <p v-if="stage === 7 && student.currentNumber >= 7 && !student.confirmed && !target">
      如收到学院沟通安置通知，请按通知安排参加面谈。当前暂无本人安置结果。
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useStudentStore } from '@/stores/student'
import { formatTime, labName } from './studentDemo'

const props = defineProps<{ stage: 6 | 7 }>()
const student = useStudentStore()
const target = computed(() => student.currentNumber >= props.stage ? student.adjustmentLab(props.stage) : undefined)
const decision = computed(() => student.decisionFor(props.stage))
const visibleLab = computed(() => decision.value?.labId ?? (student.confirmed ? undefined : target.value))

function intention(value?: boolean | null) {
  if (value == null) return '未提交'
  return value ? '服从' : '不服从'
}

async function confirm(accepted: boolean) {
  const labId = target.value
  if (!labId) return
  const action = accepted ? '接受' : '拒绝'
  const agreed = await ElMessageBox.confirm('确认' + action + labName(labId) + '的调剂？', '调剂确认')
    .then(() => true, () => false)
  if (!agreed) return
  const error = student.decide(props.stage, labId, accepted)
  if (error) ElMessage.error(error)
  else ElMessage.success('调剂结果已保存')
}
</script>
