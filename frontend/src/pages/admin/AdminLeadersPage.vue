<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h2>负责人提拔</h2>
        <p class="subtitle">从本室在职导师中任命负责人，或直接创建负责人账号；变更将记入操作日志并通知双方</p>
      </div>
      <el-button type="primary" @click="createVisible = true">新增负责人账号</el-button>
    </div>

    <el-card shadow="never">
      <div class="filters">
        <el-input v-model="keyword" placeholder="实训室名称" clearable class="keyword" />
        <el-select v-model="status" placeholder="全部状态" clearable class="status-select">
          <el-option label="启用" :value="1" />
          <el-option label="停用" :value="0" />
        </el-select>
        <el-button type="primary" plain @click="handleSearch">查询</el-button>
      </div>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="labs" stripe>
        <el-table-column prop="labCode" label="编码" width="120" />
        <el-table-column prop="labName" label="实训室" min-width="180" />
        <el-table-column prop="department" label="系部" min-width="140">
          <template #default="{ row }">{{ row.department || '-' }}</template>
        </el-table-column>
        <el-table-column label="当前负责人" min-width="120">
          <template #default="{ row }">
            <el-tag v-if="row.leaderName" type="success" size="small">{{ row.leaderName }}</el-tag>
            <span v-else class="empty-text">未设置</span>
          </template>
        </el-table-column>
        <el-table-column prop="mentorCount" label="导师数" width="90" align="right" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ row.status === 1 ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openAssign(row)">提拔负责人</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pageNum"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="loadLabs"
        />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" title="提拔负责人" width="480px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="实训室">
          <span>{{ currentLab?.labName || '-' }}</span>
        </el-form-item>
        <el-form-item label="当前负责人">
          <span>{{ currentLab?.leaderName || '未设置' }}</span>
        </el-form-item>
        <el-form-item label="新负责人" prop="userId">
          <el-select
            v-model="form.userId"
            :loading="mentorLoading"
            placeholder="请选择本室在职导师"
            filterable
            class="full-width"
          >
            <el-option
              v-for="mentor in mentorOptions"
              :key="mentor.userId"
              :label="mentor.title ? `${mentor.realName}（${mentor.title}）` : mentor.realName"
              :value="mentor.userId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="提拔理由" prop="reason">
          <el-input
            v-model="form.reason"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
            placeholder="必填，将写入操作日志"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSubmit">确认提拔</el-button>
      </template>
    </el-dialog>

    <LeaderCreateDialog v-model="createVisible" @saved="loadLabs" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { assignLabLeader, listLabs } from '@/api/adminLab'
import { listMentors } from '@/api/adminMentor'
import LeaderCreateDialog from '@/components/LeaderCreateDialog.vue'
import type { LabListItem, MentorListItem } from '@/types/basic'

interface LeaderForm {
  userId: number | null
  reason: string
}

const loading = ref(false)
const saving = ref(false)
const mentorLoading = ref(false)
const keyword = ref('')
const status = ref<number | ''>('')
const pageNum = ref(1)
const pageSize = 10
const total = ref(0)
const labs = ref<LabListItem[]>([])

const dialogVisible = ref(false)
const createVisible = ref(false)
const currentLab = ref<LabListItem | null>(null)
const mentorOptions = ref<MentorListItem[]>([])
const formRef = ref<FormInstance>()

const form = reactive<LeaderForm>({ userId: null, reason: '' })

const rules: FormRules<LeaderForm> = {
  userId: [{ required: true, message: '请选择新负责人', trigger: 'change' }],
  reason: [{ required: true, message: '请填写提拔理由', trigger: 'blur' }]
}

async function loadLabs() {
  loading.value = true
  try {
    const result = await listLabs({
      keyword: keyword.value.trim() || undefined,
      status: status.value === '' ? undefined : status.value,
      pageNum: pageNum.value,
      pageSize
    })
    labs.value = result.list
    total.value = result.total
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pageNum.value = 1
  loadLabs()
}

async function openAssign(lab: LabListItem) {
  currentLab.value = lab
  form.userId = null
  form.reason = ''
  dialogVisible.value = true
  mentorLoading.value = true
  try {
    const result = await listMentors({ labId: lab.id, status: 1, pageNum: 1, pageSize: 100 })
    mentorOptions.value = result.list
  } catch {
    mentorOptions.value = []
  } finally {
    mentorLoading.value = false
  }
}

async function handleSubmit() {
  if (!formRef.value || !currentLab.value || form.userId === null) {
    return
  }
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) {
    return
  }
  saving.value = true
  try {
    await assignLabLeader(currentLab.value.id, {
      userId: form.userId,
      reason: form.reason.trim()
    })
    ElMessage.success('负责人已更新')
    dialogVisible.value = false
    await loadLabs()
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    saving.value = false
  }
}

onMounted(loadLabs)
</script>

<style scoped>
.admin-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header h2 {
  margin: 0 0 6px;
  font-size: 20px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.subtitle {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.filters {
  display: flex;
  align-items: center;
  gap: 12px;
}

.keyword {
  width: 240px;
}

.status-select {
  width: 140px;
}

.full-width {
  width: 100%;
}

.empty-text {
  color: #909399;
  font-size: 13px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
