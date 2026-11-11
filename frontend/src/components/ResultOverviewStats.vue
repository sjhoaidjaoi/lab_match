<template>
  <el-row :gutter="16">
    <el-col :span="4">
      <el-card shadow="never" class="stat-card">
        <div class="stat-label">名额上限</div>
        <div class="stat-value">{{ overview?.totalQuota ?? 0 }}</div>
      </el-card>
    </el-col>
    <el-col :span="5">
      <el-card shadow="never" class="stat-card">
        <div class="stat-label">已录取</div>
        <div class="stat-value">{{ overview?.totalAdmitted ?? 0 }}</div>
      </el-card>
    </el-col>
    <el-col :span="5">
      <el-card shadow="never" class="stat-card">
        <div class="stat-label">已确认</div>
        <div class="stat-value">{{ overview?.totalConfirmed ?? 0 }}</div>
      </el-card>
    </el-col>
    <el-col :span="5">
      <el-card shadow="never" class="stat-card">
        <div class="stat-label">已入组</div>
        <div class="stat-value">{{ overview?.totalEnrolled ?? 0 }}</div>
      </el-card>
    </el-col>
    <el-col :span="5">
      <el-card shadow="never" class="stat-card">
        <div class="stat-label">名额饱和度</div>
        <div class="stat-value">{{ formatRate(overview?.saturationRate ?? 0) }}%</div>
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import type { ResultOverview } from '@/types/archive'

defineProps<{ overview: ResultOverview | null }>()

function formatRate(value: number): string {
  return value.toFixed(2)
}
</script>

<style scoped>
.stat-card {
  text-align: center;
}
.stat-label {
  font-size: 13px;
  color: #909399;
}
.stat-value {
  margin-top: 8px;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}
</style>
