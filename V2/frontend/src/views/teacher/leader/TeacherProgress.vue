<template>
  <div class="page">
    <PageHeader title="教师与面试情况" desc="按教师维度汇总本室面试进度与评价分布，供组长协调拟录取。" />

    <div class="card">
      <el-table :data="rows" size="small">
        <el-table-column prop="name" label="教师" width="140">
          <template #default="{ row }">
            {{ row.name }}
            <el-tag v-if="row.isLeader" size="small" type="warning" effect="plain">组长</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="assigned" label="负责学生" width="110" />
        <el-table-column prop="evaluated" label="已评价" width="110" />
        <el-table-column label="待评价" width="110">
          <template #default="{ row }">{{ row.assigned - row.evaluated }}</template>
        </el-table-column>
        <el-table-column label="平均综合分" width="130">
          <template #default="{ row }">{{ row.avg ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="完成度" min-width="200">
          <template #default="{ row }">
            <el-progress :percentage="percent(row.evaluated, row.assigned)" :stroke-width="8" />
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="card">
      <h3 class="block-title">汇总口径说明</h3>
      <ul class="muted list">
        <li>教师只能评价本室报名学生，组长可查看本室全部评价。</li>
        <li>平均分仅统计已评价学生，未评价不计入。</li>
        <li>拟录取结论以「拟录取管理」中的名单为准，不由分数自动生成。</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { teachersOf } from '@/mock/teachers'
import { useInterviewsStore } from '@/stores/interviews'
import { useAuthStore } from '@/stores/auth'

function percent(done, total) {
  if (!total) return 0
  return Math.min(100, Math.round((done / total) * 100))
}

const interviews = useInterviewsStore()
const auth = useAuthStore()
const roomTeachers = computed(() => teachersOf(auth.laboratoryId))
const rows = computed(() =>
  interviews.byTeacher.map((t) => ({
    ...t,
    isLeader: roomTeachers.value.find((x) => x.name === t.name)?.isLeader ?? false
  }))
)
</script>

<style scoped>
.block-title { margin: 0 0 12px; font-size: 15px; }
.list { padding-left: 20px; line-height: 1.9; }
</style>
