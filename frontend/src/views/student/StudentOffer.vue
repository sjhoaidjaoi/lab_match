<template>
  <section class="student-page">
    <h1>拟录取确认</h1>
    <el-empty v-if="!student.offerIds.length" description="暂无拟录取通知" />
    <template v-else>
      <p>确认截止 {{ formatTime(student.timeline[4].end) }}。收到多个拟录取通知时，只能确认一个实训室。</p>
      <div class="student-grid">
        <el-card v-for="id in student.offerIds" :key="id" shadow="never">
          <h2>{{ labName(id) }}</h2>
          <p>录取状态 · {{ status(id) }}</p>
          <el-button v-if="pending" type="primary" @click="confirm(id)">确认录取</el-button>
        </el-card>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useStudentStore } from '@/stores/student'
import { formatTime, labName } from './studentDemo'

const student = useStudentStore()
const pending = computed(() => student.currentNumber === 5 && !student.confirmed && student.offerIds.length > 1)

function status(id: number) {
  const decision = student.decisionFor(5)
  if (decision?.labId === id) return student.offerIds.length === 1 ? '已自动确认' : '已确认'
  if (decision) return '已释放名额'
  if (student.currentNumber > 5) return '逾期未确认'
  if (student.confirmed) return '已有确认去向'
  return '待确认'
}

async function confirm(id: number) {
  const agreed = await ElMessageBox.confirm(
    '确认加入' + labName(id) + '？确认后，其余拟录取名额将释放。',
    '确认录取', { type: 'warning' }
  ).then(() => true, () => false)
  if (!agreed) return
  const error = student.decide(5, id, true)
  if (error) ElMessage.error(error)
  else ElMessage.success('录取已确认')
}
</script>
