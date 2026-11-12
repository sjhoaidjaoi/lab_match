<template>
  <div class="page">
    <PageHeader title="报名及录取汇总" desc="本室报名、志愿分布、拟录取与确认情况的统一汇总视图。" />

    <div class="stat-grid" style="margin-bottom: 16px">
      <StatCard label="报名人数" :value="room.applicationsTotal" suffix="人" />
      <StatCard label="拟录取" :value="room.intendedCount" suffix="人" />
      <StatCard label="递补" :value="room.alternates.length" suffix="人" />
      <StatCard label="已确认" :value="room.confirmedCount" suffix="人" />
      <StatCard label="空缺名额" :value="room.vacancies" suffix="人" />
    </div>

    <div class="card">
      <h3 class="block-title">调剂意愿分布</h3>
      <el-table :data="obeyRows" size="small">
        <el-table-column prop="label" label="意愿" min-width="220" />
        <el-table-column prop="count" label="人数" width="100" />
        <el-table-column label="占比" min-width="200">
          <template #default="{ row }">
            <el-progress :percentage="percent(row.count, room.applicationsTotal)" :stroke-width="8" />
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="card">
      <h3 class="block-title">递补顺位</h3>
      <el-table :data="room.alternates" size="small">
        <el-table-column label="顺位" width="90">
          <template #default="{ $index }">第 {{ $index + 1 }} 位</template>
        </el-table-column>
        <el-table-column prop="studentNumber" label="学号" width="140" />
        <el-table-column prop="realName" label="姓名" width="110" />
        <el-table-column prop="total" label="综合分" width="100" />
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import { useRoomStore } from '@/stores/room'
import { useAuthStore } from '@/stores/auth'

import { applicationsOf } from '@/mock/applications'

const room = useRoomStore()
const auth = useAuthStore()
const applications = computed(() => applicationsOf(auth.laboratoryId))

function percent(done, total) {
  if (!total) return 0
  return Math.min(100, Math.round((done / total) * 100))
}

const obeyRows = computed(() => [
  { label: '服从实训室内部调剂', count: applications.value.filter((a) => a.obeyInternal).length },
  { label: '服从全院跨实训室调剂', count: applications.value.filter((a) => a.obeyCollege).length },
  { label: '两项均服从', count: applications.value.filter((a) => a.obeyInternal && a.obeyCollege).length }
])
</script>

<style scoped>
.block-title { margin: 0 0 12px; font-size: 15px; }
</style>
