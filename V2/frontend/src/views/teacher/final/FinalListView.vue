<template>
  <div class="page">
    <PageHeader title="最终名单" desc="公示结束后由学院统一发布；教师端只读。组长可导出全室，普通教师只能导出本人负责的学生。">
      <template #actions>
        <el-button @click="onExport">导出 CSV</el-button>
      </template>
    </PageHeader>

    <div class="card">
      <div class="toolbar">
        <el-tag type="success" effect="plain">正式入组 {{ rows.length }} 人</el-tag>
        <span class="muted">当前阶段：{{ stage.name }}（第 {{ stage.no }} 阶段）</span>
      </div>

      <el-table :data="rows" size="small">
        <el-table-column type="index" label="#" width="60" />
        <el-table-column prop="studentNumber" label="学号" width="140" />
        <el-table-column prop="realName" label="姓名" width="110" />
        <el-table-column prop="total" label="综合分" width="100" />
        <el-table-column label="录取来源" width="140">
          <template #default="{ row }">{{ sourceLabel(row.source) }}</template>
        </el-table-column>
        <el-table-column label="入组状态" width="140">
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
import { useStageStore } from '@/stores/stage'
import { useRoomStore } from '@/stores/room'
import { exportCsv } from '@/utils/exportCsv'
import { watermarkLine, myStudentIds } from '@/utils/exportScope'
import { useAuthStore } from '@/stores/auth'
import { useLogsStore } from '@/stores/logs'
import { useInterviewsStore } from '@/stores/interviews'

const stage = computed(() => useStageStore().current)
const room = useRoomStore()
const auth = useAuthStore()
const logs = useLogsStore()
const interviews = useInterviewsStore()
const rows = computed(() => room.finalRows)

function sourceLabel(source) {
  if (source === 'INTERNAL') return '内部调剂'
  if (source === 'ALTERNATE') return '递补补位'
  return '拟录取确认'
}

function onExport() {
  const leader = auth.isLeader
  const allowed = leader ? null : myStudentIds(interviews.records, auth.realName)
  const exportRows = rows.value.filter((r) => leader || allowed.has(r.studentId))
  if (!exportRows.length) {
    ElMessage.warning('没有可导出的学生（普通教师只能导出本人面试过的学生）')
    logs.record('EXPORT_FAILED', `导出${flag}被拒绝：无可导出学生或越权`, 'EXPORT')
    return
  }
  exportCsv(
    `本室最终名单_${room.labId}.csv`,
    ['学号', '姓名', '综合分', '录取来源', '入组状态'],
    exportRows.map((r) => [r.studentNumber, r.realName, r.total ?? '', sourceLabel(r.source), '已入组']),
    leader ? '' : watermarkLine(auth.realName, '实训室教师', '仅本人负责学生')
  )
  logs.record('EXPORT', `导出最终名单 ${exportRows.length} 条`, leader ? '本室全部' : '本人负责')
  ElMessage.success(`已导出本室最终名单 ${exportRows.length} 人`)
}
</script>
