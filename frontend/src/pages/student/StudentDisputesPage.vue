<template>
  <div class="dispute-page">
    <div class="page-header">
      <div>
        <h2>我的异议</h2>
        <p class="subtitle">异议工单处理进度与回复意见</p>
      </div>
      <el-button @click="loadDisputes">刷新</el-button>
    </div>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="disputes" row-key="id" stripe>
        <el-table-column prop="disputeNo" label="工单号" width="180" />
        <el-table-column prop="disputeTypeText" label="类型" width="140" />
        <el-table-column prop="publicityTitle" label="公示批次" min-width="220" />
        <el-table-column label="提交时间" width="180">
          <template #default="{ row }">{{ formatTime(row.gmtCreate) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="tagType(row.status)" size="small">{{ row.statusText }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && disputes.length === 0" description="暂无异议工单" />
    </el-card>

    <el-dialog v-model="detailVisible" title="异议详情" width="600px">
      <template v-if="current">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="工单号">{{ current.disputeNo }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{ current.disputeTypeText }}</el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ formatTime(current.gmtCreate) }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ current.statusText }}</el-descriptions-item>
        </el-descriptions>
        <div class="section">
          <label>异议说明</label>
          <p>{{ current.content }}</p>
        </div>
        <div v-if="current.attachments.length > 0" class="section">
          <label>附件</label>
          <div class="attachments">
            <el-link v-for="item in current.attachments" :key="item" type="primary" :href="item">
              {{ item }}
            </el-link>
          </div>
        </div>
        <div v-if="current.status === 3 || current.status === 4" class="section">
          <label>处理结果</label>
          <p>{{ current.handleResultText || '—' }}</p>
          <label>处理意见</label>
          <p>{{ current.handleOpinion || '—' }}</p>
          <label>处理人 / 时间</label>
          <p>{{ current.handlerName || '—' }} · {{ current.handleTime || '—' }}</p>
        </div>
        <el-alert
          v-else
          type="info"
          :closable="false"
          show-icon
          title="工单处理中，管理员回复后会通过站内通知告知你。"
        />
      </template>
      <template #footer>
        <el-button type="primary" @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { listMyDisputes } from '@/api/publicity'
import type { DisputeItem } from '@/types/publicity'

const loading = ref(false)
const detailVisible = ref(false)
const disputes = ref<DisputeItem[]>([])
const current = ref<DisputeItem | null>(null)

function formatTime(value: string | null): string {
  return value ? value.replace('T', ' ').slice(0, 19) : '—'
}

function tagType(status: number): 'warning' | 'primary' | 'success' | 'info' {
  if (status === 1) {
    return 'warning'
  }
  if (status === 2) {
    return 'primary'
  }
  return status === 3 ? 'success' : 'info'
}

async function loadDisputes() {
  loading.value = true
  try {
    const page = await listMyDisputes()
    disputes.value = page.list
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

function openDetail(row: DisputeItem) {
  current.value = row
  detailVisible.value = true
}

onMounted(loadDisputes)
</script>

<style scoped>
.dispute-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.page-header h2 {
  margin: 0 0 6px;
  font-size: 20px;
}

.subtitle {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.section {
  margin-top: 16px;
}

.section label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: #909399;
}

.section p {
  margin: 0 0 12px;
  font-size: 14px;
  color: #303133;
  line-height: 1.7;
}

.attachments {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
