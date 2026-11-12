<template>
  <el-card class="lab-card" shadow="hover">
    <div class="card-head">
      <h3>{{ lab.labName }}</h3>
      <el-tag :type="statusTag.type" size="small">{{ statusTag.text }}</el-tag>
    </div>
    <p class="lab-code">{{ lab.department || '系部待补充' }} · {{ lab.labCode }}</p>

    <ul class="meta">
      <li><span>负责人</span><b>{{ lab.leaderName || '未设置' }}</b></li>
      <li><span>导师数</span><b>{{ lab.mentorCount }} 人</b></li>
      <li><span>总名额</span><b>{{ lab.totalQuota }}</b></li>
    </ul>

    <div class="quota">
      <span>已录 {{ lab.quotaUsed }}</span>
      <span class="remain" :class="{ zero: lab.remainQuota <= 0 }">剩余 {{ lab.remainQuota }}</span>
    </div>

    <div v-if="directions.length > 0" class="directions">
      <el-tag v-for="item in directions" :key="item" size="small" type="info" effect="plain">
        {{ item }}
      </el-tag>
    </div>

    <div class="card-foot">
      <span class="open-day">{{ lab.openDayDate ? `开放日 ${lab.openDayDate}` : '开放日待定' }}</span>
      <router-link :to="`/labs/${lab.id}`">
        <el-button type="primary" link>查看详情</el-button>
      </router-link>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PublicLabListItem } from '@/types/public'

const props = defineProps<{
  lab: PublicLabListItem
}>()

const directions = computed(() =>
  (props.lab.researchDirection || '')
    .split(/[、,，;；]/)
    .map((item) => item.trim())
    .filter(Boolean)
)

const statusTag = computed(() => {
  if (props.lab.status !== 1) {
    return { text: '未开放', type: 'info' as const }
  }
  if (props.lab.remainQuota <= 0) {
    return { text: '已满', type: 'danger' as const }
  }
  return { text: '招录中', type: 'success' as const }
})
</script>

<style scoped>
.lab-card {
  height: 100%;
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.card-head h3 {
  margin: 0;
  font-size: 17px;
  color: #1f2d3d;
}

.lab-code {
  margin: 6px 0 12px;
  font-size: 12px;
  color: #909399;
}

.meta {
  display: flex;
  gap: 8px;
  padding: 0;
  margin: 0 0 12px;
  list-style: none;
}

.meta li {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 6px;
  background: #f7f9fc;
}

.meta span {
  font-size: 12px;
  color: #909399;
}

.meta b {
  font-size: 14px;
  color: #303133;
  font-weight: 600;
}

.quota {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #606266;
}

.remain {
  color: #67c23a;
  font-weight: 600;
}

.remain.zero {
  color: #f56c6c;
}

.directions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1px solid #f0f2f5;
}

.open-day {
  font-size: 12px;
  color: #909399;
}
</style>
