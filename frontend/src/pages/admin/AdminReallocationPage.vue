<template>
  <div class="admin-reallocation-page">
    <div class="page-header">
      <div>
        <h2>统筹调剂</h2>
        <p class="subtitle">按三级优先调剂：本室内部 → 全院跨室 → 座谈安置；支持批量分配与部分成功</p>
      </div>
      <el-tag type="warning" size="large">待调剂 {{ candidates.length }} 人</el-tag>
    </div>

    <el-alert type="info" :closable="false" show-icon>
      <template #title>
        调剂结果直接生效并释放原名额；失败条目会在结果中逐条返回，不影响其他学生。
      </template>
    </el-alert>

    <el-card shadow="never">
      <el-tabs v-model="level" @tab-change="handleTabChange">
        <el-tab-pane label="一级 · 本室内部调剂" :name="1" />
        <el-tab-pane label="二级 · 全院跨室调剂" :name="2" />
        <el-tab-pane label="三级 · 座谈安置" :name="3" />
      </el-tabs>

      <div class="toolbar">
        <span class="selected-tip">已选 {{ selectedRows.length }} 人</span>
        <el-button :disabled="selectedRows.length === 0" type="primary" @click="openBatchDialog">
          批量分配
        </el-button>
        <el-button :loading="loading" @click="loadCandidates">刷新</el-button>
      </div>

      <el-table
        v-loading="loading"
        :data="candidates"
        row-key="studentId"
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="studentNo" label="学号" width="150" />
        <el-table-column prop="studentName" label="姓名" width="120" />
        <el-table-column prop="originLabName" label="原意向实训室" min-width="180" />
        <el-table-column label="总分" width="100">
          <template #default="{ row }">
            {{ row.totalScore === null ? '—' : row.totalScore.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="调剂意愿" width="150">
          <template #default="{ row }">
            <el-tag v-if="row.acceptInnerAdjust === 1" size="small" class="wish-tag">服从内部</el-tag>
            <el-tag v-if="row.acceptCrossAdjust === 1" size="small" type="success" class="wish-tag">
              服从跨室
            </el-tag>
            <el-tag
              v-if="row.acceptInnerAdjust === 0 && row.acceptCrossAdjust === 0"
              size="small"
              type="info"
            >
              座谈安置
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="可调剂导师" min-width="200">
          <template #default="{ row }">
            <el-tag v-for="mentor in row.availableMentors" :key="mentor.mentorId" size="small" class="mentor-tag">
              {{ mentor.mentorName }}（余 {{ mentor.remainQuota }}）
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openSingleDialog(row)">分配</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && candidates.length === 0" description="当前级别暂无待调剂学生" />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="levelTitle" width="520px">
      <p class="dialog-tip">本次分配 {{ pendingRows.length }} 名学生</p>
      <el-form label-width="90px">
        <el-form-item label="目标导师" required>
          <el-select v-model="toMentorId" placeholder="请选择目标导师" class="full-width">
            <el-option
              v-for="mentor in mentorOptions"
              :key="mentor.mentorId"
              :label="`${mentor.mentorName} · ${mentor.labName}（剩余 ${mentor.remainQuota}）`"
              :value="mentor.mentorId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="调剂说明" :required="level === 3">
          <el-input
            v-model="reason"
            type="textarea"
            :rows="3"
            maxlength="500"
            show-word-limit
            :placeholder="level === 3 ? '座谈安置必须填写说明' : '选填'"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确认分配</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MockError } from '@/mock/auth'
import { ROUND_ID, mockAdminCandidates, mockAdminReallocate } from '@/mock/reallocation'
import type { ReallocationCandidate, ReallocationMentor } from '@/types/reallocation'

const level = ref<number>(1)
const loading = ref(false)
const submitting = ref(false)
const candidates = ref<ReallocationCandidate[]>([])
const selectedRows = ref<ReallocationCandidate[]>([])
const pendingRows = ref<ReallocationCandidate[]>([])
const dialogVisible = ref(false)
const toMentorId = ref<number | null>(null)
const reason = ref('')
let singleMode = false

const levelTitle = computed(() => {
  if (level.value === 1) {
    return '一级 · 本室内部调剂'
  }
  return level.value === 2 ? '二级 · 全院跨室调剂' : '三级 · 座谈安置'
})

const mentorOptions = computed<ReallocationMentor[]>(() => {
  const map = new Map<number, ReallocationMentor>()
  pendingRows.value.forEach((row) => {
    row.availableMentors.forEach((mentor) => {
      const exists = map.get(mentor.mentorId)
      if (!exists || mentor.remainQuota < exists.remainQuota) {
        map.set(mentor.mentorId, mentor)
      }
    })
  })
  return Array.from(map.values()).filter((mentor) => mentor.remainQuota > 0)
})

async function loadCandidates() {
  loading.value = true
  try {
    candidates.value = await mockAdminCandidates(level.value)
    selectedRows.value = []
  } catch (error) {
    ElMessage.error(error instanceof MockError ? error.message : '加载调剂候选失败')
  } finally {
    loading.value = false
  }
}

function handleTabChange() {
  void loadCandidates()
}

function handleSelectionChange(rows: ReallocationCandidate[]) {
  selectedRows.value = rows
}

function openBatchDialog() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先勾选学生')
    return
  }
  singleMode = false
  pendingRows.value = [...selectedRows.value]
  toMentorId.value = mentorOptions.value[0]?.mentorId ?? null
  reason.value = ''
  dialogVisible.value = true
}

function openSingleDialog(row: ReallocationCandidate) {
  singleMode = true
  pendingRows.value = [row]
  toMentorId.value = row.availableMentors[0]?.mentorId ?? null
  reason.value = ''
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!toMentorId.value) {
    ElMessage.warning('请选择目标导师')
    return
  }
  if (level.value === 3 && !reason.value.trim()) {
    ElMessage.warning('座谈安置必须填写说明')
    return
  }
  try {
    await ElMessageBox.confirm('调剂结果直接生效，学生无需确认，确认提交？', '调剂确认', {
      type: 'warning'
    })
  } catch {
    return
  }
  submitting.value = true
  try {
    const result = await mockAdminReallocate({
      roundId: ROUND_ID,
      level: level.value,
      items: pendingRows.value.map((row) => ({
        studentId: row.studentId,
        toMentorId: toMentorId.value as number
      })),
      reason: reason.value.trim()
    })
    const failText = result.failList
      .map((item) => `${item.studentName}：${item.reason}`)
      .join('\n')
    await ElMessageBox.alert(
      `成功 ${result.successCount} 人，失败 ${result.failCount} 人${failText ? `\n${failText}` : ''}`,
      '调剂结果',
      { type: result.failCount > 0 ? 'warning' : 'success' }
    )
    dialogVisible.value = false
    if (singleMode) {
      selectedRows.value = []
    }
    await loadCandidates()
  } catch (error) {
    ElMessage.error(error instanceof MockError ? error.message : '调剂失败')
  } finally {
    submitting.value = false
  }
}

onMounted(loadCandidates)
</script>

<style scoped>
.admin-reallocation-page {
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

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 12px 0;
}

.selected-tip {
  font-size: 13px;
  color: #606266;
}

.mentor-tag,
.wish-tag {
  margin-right: 6px;
}

.dialog-tip {
  margin: 0 0 12px;
  font-size: 14px;
  color: #303133;
}

.full-width {
  width: 100%;
}
</style>
