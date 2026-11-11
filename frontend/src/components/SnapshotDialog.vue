<template>
  <el-dialog
    v-model="visible"
    :title="`快照管理 · ${round?.roundName ?? ''}`"
    width="820px"
    destroy-on-close
  >
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="快照采用追加写入：同轮同类型重新生成时，旧版本 is_current 置 0，新版本 version + 1，历史版本永久保留。"
    />

    <div class="toolbar">
      <span class="label">快照类型</span>
      <el-select v-model="snapshotType" style="width: 180px">
        <el-option
          v-for="item in snapshotTypes"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
      <el-button type="primary" :loading="generating" @click="generate">生成快照</el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="snapshots"
      stripe
      max-height="320"
      empty-text="暂无可展示的快照记录"
    >
      <el-table-column label="类型" min-width="110">
        <template #default="{ row }">{{ row.snapshotTypeText }}</template>
      </el-table-column>
      <el-table-column label="版本" width="90">
        <template #default="{ row }">
          v{{ row.version }}
          <el-tag v-if="row.isCurrent === 1" type="success" size="small" class="current-tag">当前</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="recordCount" label="记录数" width="90" />
      <el-table-column prop="operatorName" label="操作人" width="110" />
      <el-table-column prop="gmtCreate" label="生成时间" min-width="170" />
    </el-table>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { generateSnapshot, listSnapshots } from '@/api/adminArchive'
import type { RoundListItem } from '@/types/basic'
import type { RoundSnapshotItem, SnapshotType } from '@/types/archive'

const props = defineProps<{ modelValue: boolean; round: RoundListItem | null }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  generated: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const snapshotTypes = [
  { value: 1, label: '拟录取名单' },
  { value: 2, label: '确认结果' },
  { value: 3, label: '调剂结果' },
  { value: 4, label: '最终归档' }
]

const snapshotType = ref<SnapshotType>(4)
const snapshots = ref<RoundSnapshotItem[]>([])
const generating = ref(false)
const loading = ref(false)

async function loadSnapshots() {
  if (!props.round) {
    return
  }
  loading.value = true
  try {
    snapshots.value = await listSnapshots(props.round.id)
  } catch {
    snapshots.value = []
  } finally {
    loading.value = false
  }
}

async function generate() {
  if (!props.round) {
    return
  }
  generating.value = true
  try {
    const result = await generateSnapshot(props.round.id, snapshotType.value)
    ElMessage.success(`快照 v${result.version} 已生成，共 ${result.recordCount} 条记录`)
    emit('generated')
    await loadSnapshots()
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    generating.value = false
  }
}

watch(
  () => props.modelValue,
  (value) => {
    if (value) {
      snapshotType.value = 4
      loadSnapshots()
    }
  }
)
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px 0;
}

.label {
  font-size: 13px;
  color: #606266;
}

.current-tag {
  margin-left: 6px;
}
</style>
