<template>
  <el-table :data="rows" max-height="65vh" stripe size="small" empty-text="暂无学生记录">
    <el-table-column label="实训室" min-width="145">
      <template #default="{ row }">{{ row.laboratoryName || '未落实去向' }}</template>
    </el-table-column>
    <el-table-column label="指导教师" min-width="100">
      <template #default="{ row }">{{ row.teacherName || (row.laboratoryName ? '尚未指定' : '—') }}</template>
    </el-table-column>
    <el-table-column v-if="admin" prop="studentNumber" label="学号" min-width="120" />
    <el-table-column prop="studentName" label="学生姓名" min-width="100" />
    <el-table-column label="入组情况" min-width="140">
      <template #default="{ row }">{{ rosterStatus(row.finalStatus) }}</template>
    </el-table-column>
    <slot />
  </el-table>
</template>
<script setup lang="ts">
import type { PublishedRosterRow } from '@/types'
import { rosterStatus } from '@/config/roster'
defineProps<{ rows: PublishedRosterRow[]; admin?: boolean }>()
</script>
