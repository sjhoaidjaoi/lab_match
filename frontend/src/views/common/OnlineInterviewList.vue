<template>
  <section class="page">
    <header class="page-header">
      <h2 class="page-title">本实训室线上面试</h2>
      <p class="page-desc">查看当前批次线上面试安排。组长可旁听正在进行的会议。</p>
    </header>
    <el-card v-loading="loading" shadow="never">
      <el-table :data="meetings" empty-text="本实训室暂无线上面试">
        <el-table-column prop="studentName" label="学生" min-width="100" />
        <el-table-column label="预约时间" min-width="165"><template #default="{ row }">{{ formatTime(row.interviewTime) }}</template></el-table-column>
        <el-table-column label="状态" min-width="125"><template #default="{ row }">{{ meetingStatusLabels[row.status as MeetingStatus] }}</template></el-table-column>
        <el-table-column label="会议" width="110"><template #default="{ row }"><router-link :to="`/meeting/${row.id}`">查看会议 →</router-link></template></el-table-column>
      </el-table>
    </el-card>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { interviewVideoApi, meetingStatusLabels, type MeetingStatus, type MeetingSummary } from '@/api/interviewVideo'
import { formatTime } from '../college/shared'

const loading = ref(true)
const meetings = ref<MeetingSummary[]>([])
onMounted(async () => {
  try { meetings.value = await interviewVideoApi.list() }
  catch { /* 请求层显示原因 */ }
  finally { loading.value = false }
})
</script>
