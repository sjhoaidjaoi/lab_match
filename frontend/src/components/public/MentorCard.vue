<template>
  <div class="mentor-card">
    <el-avatar :size="46" class="avatar">{{ avatarText }}</el-avatar>
    <div class="mentor-main">
      <div class="mentor-head">
        <span class="name">{{ mentor.realName }}</span>
        <span class="title">{{ mentor.title || '导师' }}</span>
        <el-tag v-if="mentor.remainQuota <= 0" size="small" type="danger">已满</el-tag>
      </div>
      <p class="direction">{{ mentor.researchDirection || '研究方向待补充' }}</p>
      <p class="quota">
        个人名额 {{ mentor.quota }} · 已录 {{ mentor.quotaUsed }} ·
        <span :class="{ zero: mentor.remainQuota <= 0 }">剩余 {{ mentor.remainQuota }}</span>
      </p>
    </div>
    <router-link :to="`/mentors/${mentor.id}`">
      <el-button size="small">查看导师</el-button>
    </router-link>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PublicLabMentor } from '@/types/public'

const props = defineProps<{
  mentor: PublicLabMentor
}>()

const avatarText = computed(() => props.mentor.realName?.slice(0, 1) || '师')
</script>

<style scoped>
.mentor-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #ffffff;
}

.avatar {
  flex-shrink: 0;
  background: #ecf5ff;
  color: #409eff;
  font-size: 18px;
}

.mentor-main {
  flex: 1;
  min-width: 0;
}

.mentor-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.name {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.title {
  font-size: 12px;
  color: #909399;
}

.direction {
  margin: 6px 0 4px;
  font-size: 13px;
  color: #606266;
}

.quota {
  margin: 0;
  font-size: 12px;
  color: #909399;
}

.quota .zero {
  color: #f56c6c;
  font-weight: 600;
}
</style>
