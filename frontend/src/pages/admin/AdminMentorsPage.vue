<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h2>导师与名额</h2>
        <p class="subtitle">查看全院导师档案，强制调整名额并维护账号状态</p>
      </div>
      <div class="header-actions">
        <el-button plain @click="importVisible = true">导入教师</el-button>
        <el-button type="primary" @click="openCreate">新增教师</el-button>
      </div>
    </div>

    <el-card shadow="never">
      <div class="filters">
        <el-select v-model="labFilter" placeholder="全部实训室" clearable class="lab-select">
          <el-option v-for="lab in labs" :key="lab.id" :label="lab.labName" :value="lab.id" />
        </el-select>
        <el-input v-model="keyword" placeholder="工号 / 姓名" clearable class="keyword" />
        <el-button type="primary" plain @click="loadData">查询</el-button>
      </div>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="mentors" stripe>
        <el-table-column prop="userNo" label="工号" width="120" />
        <el-table-column prop="realName" label="姓名" width="100" />
        <el-table-column prop="labName" label="所属实训室" min-width="140" />
        <el-table-column prop="title" label="职称" width="90">
          <template #default="{ row }">{{ row.title || '-' }}</template>
        </el-table-column>
        <el-table-column prop="researchDirection" label="研究方向" min-width="150">
          <template #default="{ row }">{{ row.researchDirection || '-' }}</template>
        </el-table-column>
        <el-table-column prop="quota" label="名额" width="70" />
        <el-table-column prop="quotaUsed" label="已占用" width="80" />
        <el-table-column prop="remainQuota" label="剩余" width="70" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button
              link
              type="warning"
              size="small"
              :loading="resettingId === row.id"
              @click="resetPassword(row)"
            >
              重置密码
            </el-button>
            <el-button link type="primary" size="small" @click="openQuota(row)">调整名额</el-button>
            <el-button
              link
              :type="row.status === 1 ? 'danger' : 'success'"
              size="small"
              @click="toggleStatus(row)"
            >
              {{ row.status === 1 ? '禁用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="quotaDialogVisible" title="强制调整导师名额" width="440px">
      <el-form ref="quotaFormRef" :model="quotaForm" :rules="quotaRules" label-width="90px">
        <el-form-item label="导师">
          <span>{{ quotaForm.realName }}</span>
        </el-form-item>
        <el-form-item label="新名额" prop="quota">
          <el-input-number v-model="quotaForm.quota" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="调整理由" prop="reason">
          <el-input v-model="quotaForm.reason" type="textarea" :rows="3" placeholder="必填，将写入操作日志" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="quotaDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleQuota">确认调整</el-button>
      </template>
    </el-dialog>

    <MentorFormDialog v-model="formVisible" :mentor="editingMentor" :labs="labs" @saved="loadData" />
    <MentorImportDialog v-model="importVisible" @imported="loadData" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { listLabs } from '@/api/adminLab'
import {
  forceAdjustMentorQuota,
  listMentors,
  resetMentorPassword,
  updateMentorStatus
} from '@/api/adminMentor'
import MentorFormDialog from '@/components/MentorFormDialog.vue'
import MentorImportDialog from '@/components/MentorImportDialog.vue'
import type { LabListItem, MentorListItem } from '@/types/basic'

interface MentorQuotaForm {
  id: number
  realName: string
  quota: number
  quotaUsed: number
  reason: string
}

const loading = ref(false)
const saving = ref(false)
const labs = ref<LabListItem[]>([])
const mentors = ref<MentorListItem[]>([])
const labFilter = ref<number | ''>('')
const keyword = ref('')

const formVisible = ref(false)
const editingMentor = ref<MentorListItem | null>(null)
const importVisible = ref(false)
const resettingId = ref<number | null>(null)

const quotaDialogVisible = ref(false)
const quotaFormRef = ref<FormInstance>()
const quotaForm = reactive<MentorQuotaForm>({ id: 0, realName: '', quota: 0, quotaUsed: 0, reason: '' })

const quotaRules: FormRules<MentorQuotaForm> = {
  quota: [
    { required: true, message: '请输入新名额', trigger: 'blur' },
    {
      validator: (_rule: unknown, value: number, callback: (error?: Error) => void) => {
        if (value < quotaForm.quotaUsed) {
          callback(new Error(`新名额不得小于已占用名额（${quotaForm.quotaUsed} 人）`))
          return
        }
        callback()
      },
      trigger: 'blur'
    }
  ],
  reason: [{ required: true, message: '请输入调整理由', trigger: 'blur' }]
}

async function loadData() {
  loading.value = true
  try {
    const [labPage, mentorPage] = await Promise.all([
      listLabs({ pageNum: 1, pageSize: 100 }),
      listMentors({
        labId: labFilter.value === '' ? undefined : labFilter.value,
        keyword: keyword.value.trim() || undefined,
        pageNum: 1,
        pageSize: 100
      })
    ])
    labs.value = labPage.list
    mentors.value = mentorPage.list
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingMentor.value = null
  formVisible.value = true
}

function openEdit(mentor: MentorListItem) {
  editingMentor.value = mentor
  formVisible.value = true
}

async function resetPassword(mentor: MentorListItem) {
  try {
    await ElMessageBox.confirm(
      `确定将「${mentor.realName}」的密码重置为系统初始密码吗？重置后需重新改密。`,
      '提示',
      { type: 'warning' }
    )
  } catch {
    return
  }
  resettingId.value = mentor.id
  try {
    await resetMentorPassword(mentor.id)
    ElMessage.success('密码已重置')
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    resettingId.value = null
  }
}

function openQuota(mentor: MentorListItem) {
  quotaForm.id = mentor.id
  quotaForm.realName = mentor.realName
  quotaForm.quota = mentor.quota
  quotaForm.quotaUsed = mentor.quotaUsed
  quotaForm.reason = ''
  quotaDialogVisible.value = true
}

async function handleQuota() {
  if (!quotaFormRef.value) {
    return
  }
  const valid = await quotaFormRef.value.validate().catch(() => false)
  if (!valid) {
    return
  }
  saving.value = true
  try {
    await forceAdjustMentorQuota(quotaForm.id, {
      quota: quotaForm.quota,
      reason: quotaForm.reason.trim()
    })
    ElMessage.success('名额已调整')
    quotaDialogVisible.value = false
    await loadData()
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    saving.value = false
  }
}

async function toggleStatus(mentor: MentorListItem) {
  const nextStatus = mentor.status === 1 ? 0 : 1
  const actionText = nextStatus === 1 ? '启用' : '禁用'
  try {
    await ElMessageBox.confirm(`确定${actionText}「${mentor.realName}」的账号吗？`, '提示', {
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    await updateMentorStatus(mentor.id, nextStatus)
    ElMessage.success(`已${actionText}`)
    await loadData()
  } catch {
    // 错误提示已由请求层统一处理
  }
}

onMounted(loadData)
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

.subtitle {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.filters {
  display: flex;
  gap: 12px;
}

.lab-select {
  width: 200px;
}

.keyword {
  width: 200px;
}

.header-actions {
  display: flex;
  gap: 12px;
}
</style>
