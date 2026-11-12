<template>
  <div class="page">
    <PageHeader title="本室最终名单" desc="学院公示结束后的正式入组名单，组长可导出。">
      <template #actions>
        <el-button @click="onExport">导出 CSV</el-button>
      </template>
    </PageHeader>

    <div class="card">
      <div class="toolbar">
        <el-tag type="success" effect="plain">正式入组 {{ rows.length }} 人</el-tag>
        <el-tag type="warning" effect="plain">内部调剂补录 {{ adjustedCount }} 人</el-tag>
      </div>
      <el-table :data="rows" size="small">
        <el-table-column type="index" label="#" width="60" />
        <el-table-column prop="studentNumber" label="学号" width="140" />
        <el-table-column prop="realName" label="姓名" width="110" />
        <el-table-column prop="total" label="综合分" width="100" />
        <el-table-column label="录取来源" width="150">
          <template #default="{ row }">{{ sourceLabel(row.source) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default><StatusTag status="ADMITTED" /></template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import { useRoomStore } from '@/stores/room'
import { exportCsv } from '@/utils/exportCsv'
import { useLogsStore } from '@/stores/logs'

const room = useRoomStore()
const logs = useLogsStore()
const rows = computed(() => room.finalRows)
const adjustedCount = computed(() => room.finalRows.filter((r) => r.source === 'INTERNAL').length)

function sourceLabel(source) {
  if (source === 'INTERNAL') return '内部调剂'
  if (source === 'ALTERNATE') return '递补补位'
  return '拟录取确认'
}

function onExport() {
  if (!rows.value.length) {
    ElMessage.warning('暂无最终名单可导出')
    return
  }
  exportCsv(
    `本室最终名单_${room.labId}.csv`,
    ['学号', '姓名', '综合分', '录取来源', '状态'],
    rows.value.map((r) => [r.studentNumber, r.realName, r.total ?? '', sourceLabel(r.source), '已录取'])
  )
  logs.record('EXPORT', `导出本室最终名单 ${rows.value.length} 人`, 'LEADER')
  ElMessage.success(`已导出本室最终名单 ${rows.value.length} 人`)
}
</script>
