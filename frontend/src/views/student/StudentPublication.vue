<template>
  <section class="student-page">
    <h1>最终结果与公示</h1>
    <el-empty v-if="student.currentNumber < 8" description="最终录取结果尚未公示" />
    <template v-else>
      <el-card shadow="never">
        <h2>学院录取公示</h2>
        <p>公示时间 · {{ formatTime(student.timeline[7].start) }} 至 {{ formatTime(student.timeline[7].end) }}</p>
        <ul class="student-list">
          <li v-if="lab">{{ maskedAccount }}（本人） · {{ lab.name }}</li>
          <li v-for="item in publicEntries" :key="item.code">{{ item.code }} · {{ labName(item.labId) }}</li>
        </ul>
      </el-card>
      <el-card shadow="never">
        <h2>个人最终结果</h2>
        <template v-if="lab">
          <p><el-tag :type="student.currentNumber === 8 ? 'warning' : 'success'">{{ student.currentNumber === 8 ? '公示中' : '已正式入组' }}</el-tag></p>
          <dl class="student-fields">
            <dt>录取实训室</dt><dd>{{ lab.name }}</dd>
            <dt>实训室负责人</dt><dd>{{ lab.leader }}</dd>
            <dt>入组安排</dt><dd>请在公示结束后到 {{ lab.room }} 联系 {{ lab.leader }} 报到。</dd>
            <dt>培养计划</dt><dd>{{ lab.training }}</dd>
          </dl>
        </template>
        <el-empty v-else description="本批次暂无个人录取结果" />
      </el-card>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useStudentStore } from '@/stores/student'
import { formatTime, labName, labs } from './studentDemo'

const auth = useAuthStore()
const student = useStudentStore()
const lab = computed(() => labs.find(item => item.id === student.confirmed?.labId))
const maskedAccount = computed(() => {
  const account = auth.user?.username ?? ''
  return account.length >= 6 ? account.slice(0, 2) + '****' + account.slice(-2) : '****'
})
const publicEntries = [
  { code: '20****11', labId: 1 },
  { code: '20****32', labId: 2 },
  { code: '20****53', labId: 3 }
]
</script>
