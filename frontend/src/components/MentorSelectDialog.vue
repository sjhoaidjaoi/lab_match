<template>
  <el-dialog v-model="visible" title="选择导师" width="760px">
    <div class="filters">
      <el-input v-model="keyword" placeholder="导师姓名 / 研究方向" clearable class="keyword" />
      <el-select v-model="labFilter" placeholder="全部实训室" clearable class="lab-select">
        <el-option v-for="lab in labs" :key="lab.id" :label="lab.labName" :value="lab.id" />
      </el-select>
    </div>

    <div v-loading="loading" class="mentor-list">
      <el-checkbox
        v-for="mentor in filteredMentors"
        :key="mentor.mentorId"
        class="mentor-item"
        :model-value="selected.includes(mentor.mentorId)"
        :disabled="isDisabled(mentor)"
        @change="toggle(mentor)"
      >
        <div class="mentor-info">
          <div class="mentor-title">
            <span class="name">{{ mentor.mentorName }}</span>
            <span class="title">{{ mentor.title || '导师' }}</span>
            <el-tag v-if="mentor.selectable === 0" type="info" size="small">已满</el-tag>
          </div>
          <div class="mentor-meta">{{ mentor.labName }} · {{ mentor.researchDirection || '研究方向待补充' }}</div>
          <div class="mentor-quota">剩余名额 {{ mentor.remainQuota }} / {{ mentor.quota }}</div>
        </div>
      </el-checkbox>
      <el-empty v-if="!loading && filteredMentors.length === 0" description="暂无可选导师" />
    </div>

    <template #footer>
      <span class="count">已选 {{ selected.length }} / {{ maxCount }}</span>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleConfirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { listAvailableMentors } from '@/api/intention'
import type { AvailableMentor, IntentionItem } from '@/types/student'

interface LabOption {
  id: number
  labName: string
}

interface Props {
  modelValue: boolean
  selectedIds: number[]
  maxCount: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', items: IntentionItem[]): void
}>()

const loading = ref(false)
const keyword = ref('')
const labFilter = ref<number | ''>('')
const allMentors = ref<AvailableMentor[]>([])
const selected = ref<number[]>([])

const labs = computed<LabOption[]>(() => {
  const map = new Map<number, LabOption>()
  allMentors.value.forEach((mentor) => {
    if (!map.has(mentor.labId)) {
      map.set(mentor.labId, { id: mentor.labId, labName: mentor.labName })
    }
  })
  return Array.from(map.values())
})

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const filteredMentors = computed(() => {
  const text = keyword.value.trim()
  return allMentors.value.filter((mentor) => {
    const matchKeyword =
      !text ||
      mentor.mentorName.includes(text) ||
      (mentor.researchDirection ?? '').includes(text)
    const matchLab = labFilter.value === '' || mentor.labId === labFilter.value
    return matchKeyword && matchLab
  })
})

function isDisabled(mentor: AvailableMentor): boolean {
  if (mentor.selectable === 0) {
    return true
  }
  return !selected.value.includes(mentor.mentorId) && selected.value.length >= props.maxCount
}

function toggle(mentor: AvailableMentor) {
  if (isDisabled(mentor)) {
    if (mentor.selectable === 0) {
      ElMessage.warning('该导师名额已满')
    } else {
      ElMessage.warning(`最多选择 ${props.maxCount} 个意向`)
    }
    return
  }
  const index = selected.value.indexOf(mentor.mentorId)
  if (index >= 0) {
    selected.value.splice(index, 1)
  } else {
    selected.value.push(mentor.mentorId)
  }
}

async function loadData() {
  loading.value = true
  try {
    const page = await listAvailableMentors({ pageNum: 1, pageSize: 100, onlyAvailable: 0 })
    allMentors.value = page.list
  } catch {
    allMentors.value = []
  } finally {
    loading.value = false
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) {
      return
    }
    keyword.value = ''
    labFilter.value = ''
    selected.value = [...props.selectedIds]
    loadData()
  }
)

function handleConfirm() {
  const items = selected.value
    .map((id) => allMentors.value.find((mentor) => mentor.mentorId === id))
    .filter((mentor): mentor is AvailableMentor => Boolean(mentor))
    .map((mentor) => ({
      mentorId: mentor.mentorId,
      mentorName: mentor.mentorName,
      labId: mentor.labId,
      labName: mentor.labName,
      researchDirection: mentor.researchDirection ?? '',
      remainQuota: mentor.remainQuota
    }))
  emit('confirm', items)
  visible.value = false
}
</script>

<style scoped>
.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.keyword {
  width: 260px;
}

.lab-select {
  width: 200px;
}

.mentor-list {
  max-height: 420px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.mentor-item {
  height: auto;
  margin-right: 0;
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  align-items: flex-start;
}

.mentor-item :deep(.el-checkbox__label) {
  width: 100%;
}

.mentor-info {
  width: 100%;
  white-space: normal;
}

.mentor-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.name {
  font-size: 15px;
  font-weight: 600;
  color: #1f2d3d;
}

.title {
  font-size: 12px;
  color: #909399;
}

.mentor-meta {
  margin-top: 6px;
  font-size: 13px;
  color: #606266;
}

.mentor-quota {
  margin-top: 4px;
  font-size: 12px;
  color: #409eff;
}

.count {
  margin-right: 12px;
  font-size: 13px;
  color: #606266;
}
</style>
