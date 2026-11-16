<template>
  <div class="page">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h2 class="page-title">名额统计</h2>
          <p class="page-desc">查看本实训室计划名额、已确认与最终录取情况，并核对剩余名额上报记录。</p>
        </div>
        <el-button :loading="loading" @click="load">刷新</el-button>
      </div>
    </div>

    <el-alert
      v-if="!labId"
      type="warning"
      :closable="false"
      show-icon
      title="未绑定实训室"
      description="当前账号未绑定负责的实训室，请联系学院管理员配置后再使用本页面。"
    />

    <template v-else>
      <el-row :gutter="14" class="summary" v-loading="loading">
        <el-col :xs="12" :lg="6">
          <div class="stat-card">
            <div class="stat-label">计划名额</div>
            <div class="stat-value">{{ stats?.quota ?? 0 }}<span class="stat-unit">个</span></div>
          </div>
        </el-col>
        <el-col :xs="12" :lg="6">
          <div class="stat-card">
            <div class="stat-label">已确认</div>
            <div class="stat-value success">{{ stats?.confirmed ?? 0 }}<span class="stat-unit">人</span></div>
          </div>
        </el-col>
        <el-col :xs="12" :lg="6">
          <div class="stat-card">
            <div class="stat-label">最终录取</div>
            <div class="stat-value">{{ stats?.admitted ?? 0 }}<span class="stat-unit">人</span></div>
          </div>
        </el-col>
        <el-col :xs="12" :lg="6">
          <div class="stat-card">
            <div class="stat-label">剩余名额</div>
            <div class="stat-value warning">{{ stats?.remaining ?? 0 }}<span class="stat-unit">个</span></div>
          </div>
        </el-col>
      </el-row>

      <el-card shadow="never" class="block" v-loading="loading">
        <template #header>
          <div class="block-header">
            <span>名额占用情况</span>
            <el-tag :type="(stats?.remaining ?? 0) > 0 ? 'warning' : 'success'" effect="plain">
              {{ (stats?.remaining ?? 0) > 0 ? '有空缺' : '已满员' }}
            </el-tag>
          </div>
        </template>
        <div class="capacity">
          <div class="capacity-head">
            <span class="capacity-name">{{ stats?.lab?.name || '本实训室' }}</span>
            <span class="muted">已确认 {{ stats?.confirmed ?? 0 }} / 计划名额 {{ stats?.quota ?? 0 }}</span>
          </div>
          <el-progress
            :percentage="usage"
            :stroke-width="14"
            :status="usage >= 100 ? 'success' : undefined"
          />
          <div class="capacity-foot">
            <span>拟录取 {{ stats?.intended ?? 0 }} 人</span>
            <span>最终录取 {{ stats?.admitted ?? 0 }} 人</span>
            <span>剩余 {{ stats?.remaining ?? 0 }} 个</span>
          </div>
        </div>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div class="block-header">
            <span>剩余名额上报记录</span>
            <span v-if="stats?.vacancyReport" class="muted">
              最近上报：{{ formatTime(stats.vacancyReport.reportedAt) }}
            </span>
          </div>
        </template>
        <el-table v-loading="loading" :data="reportRows" stripe>
          <el-table-column label="上报时间" width="180">
            <template #default="{ row }">{{ formatTime(row.reportedAt) }}</template>
          </el-table-column>
          <el-table-column label="剩余名额" width="120" align="center">
            <template #default="{ row }">
              <el-tag type="warning" effect="plain">{{ row.remaining }} 个</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="note" label="备注" min-width="240" show-overflow-tooltip>
            <template #default="{ row }">{{ row.note || '—' }}</template>
          </el-table-column>
          <template #empty><span class="muted">暂无上报记录</span></template>
        </el-table>
      </el-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { labApi, type LabStats } from '@/api/lab'
import { useAuthStore } from '@/stores/auth'
import { formatTime } from '../college/shared'

const auth = useAuthStore()
const labId = computed(() => auth.user?.laboratoryId ?? null)

const stats = ref<LabStats | null>(null)
const loading = ref(false)

const usage = computed(() => {
  const quota = stats.value?.quota ?? 0
  if (!quota) return 0
  const confirmed = stats.value?.confirmed ?? 0
  return Math.min(Math.round((confirmed / quota) * 100), 100)
})

const reportRows = computed(() =>
  stats.value?.vacancyReport ? [stats.value.vacancyReport] : []
)

async function load() {
  const id = labId.value
  if (!id) return
  loading.value = true
  try {
    stats.value = await labApi.stats(id)
  } catch (e) {
    console.error(e)
    ElMessage.error('名额统计加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.summary { margin-bottom: 14px; }
.stat-card { background: #fff; border: 1px solid var(--lm-border); border-radius: var(--lm-radius); padding: 14px 16px; margin-bottom: 12px; }
.stat-label { color: var(--lm-text-secondary); font-size: 12.5px; }
.stat-value { font-size: 24px; font-weight: 600; margin-top: 6px; color: #1f2937; }
.stat-value.success { color: #16a34a; }
.stat-value.warning { color: #d97706; }
.stat-unit { font-size: 12px; font-weight: 400; color: var(--lm-text-secondary); margin-left: 3px; }
.block { margin-bottom: 14px; }
.block-header { display: flex; align-items: center; justify-content: space-between; }
.capacity { padding: 6px 4px 2px; }
.capacity-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 12px; }
.capacity-name { font-weight: 600; }
.capacity-foot { display: flex; gap: 24px; margin-top: 12px; color: var(--lm-text-secondary); font-size: 12.5px; }
.muted { color: var(--lm-text-secondary); font-size: 12.5px; }
</style>
