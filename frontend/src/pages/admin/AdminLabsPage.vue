<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h2>实训室管理</h2>
        <p class="subtitle">维护实训室档案、总名额与负责人</p>
      </div>
      <el-button type="primary" @click="openCreate">新建实训室</el-button>
    </div>

    <el-card shadow="never" class="filter-card">
      <div class="filters">
        <el-input v-model="keyword" placeholder="实训室名称 / 编码" clearable class="keyword" />
        <el-select v-model="statusFilter" placeholder="状态" clearable class="status">
          <el-option label="开放" :value="1" />
          <el-option label="关闭" :value="0" />
        </el-select>
        <el-button type="primary" plain @click="loadLabs">查询</el-button>
      </div>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="labs" stripe>
        <el-table-column prop="labCode" label="编码" width="130" />
        <el-table-column prop="labName" label="实训室名称" min-width="150" />
        <el-table-column prop="leaderName" label="负责人" width="110">
          <template #default="{ row }">{{ row.leaderName || '未设置' }}</template>
        </el-table-column>
        <el-table-column prop="mentorCount" label="导师数" width="80" />
        <el-table-column prop="totalQuota" label="总名额" width="80" />
        <el-table-column prop="quotaUsed" label="已占用" width="80" />
        <el-table-column prop="remainQuota" label="剩余" width="80" />
        <el-table-column prop="openDayDate" label="开放日" width="110">
          <template #default="{ row }">{{ row.openDayDate || '-' }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '开放' : '关闭' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button link type="primary" size="small" @click="openLeader(row)">设负责人</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑实训室' : '新建实训室'" width="760px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <div class="form-grid">
          <el-form-item label="实训室编码" prop="labCode">
            <el-input v-model="form.labCode" placeholder="如 LAB-AI-01" />
          </el-form-item>
          <el-form-item label="实训室名称" prop="labName">
            <el-input v-model="form.labName" placeholder="请输入名称" />
          </el-form-item>
          <el-form-item label="研究方向">
            <el-input v-model="form.researchDirection" placeholder="如 计算机视觉、大模型应用" />
          </el-form-item>
          <el-form-item label="总名额" prop="totalQuota">
            <el-input-number v-model="form.totalQuota" :min="0" :max="999" />
          </el-form-item>
          <el-form-item label="开放日">
            <el-date-picker v-model="form.openDayDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" />
          </el-form-item>
          <el-form-item label="开放时段">
            <div class="time-range">
              <el-time-picker v-model="form.openDayStartTime" value-format="HH:mm" placeholder="开始" />
              <span>至</span>
              <el-time-picker v-model="form.openDayEndTime" value-format="HH:mm" placeholder="结束" />
            </div>
          </el-form-item>
          <el-form-item label="开放日地点">
            <el-input v-model="form.openDayLocation" placeholder="如 实验楼 A301" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="form.status">
              <el-option label="开放" :value="1" />
              <el-option label="关闭" :value="0" />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="简介">
          <el-input v-model="form.introduction" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="设备与环境">
          <el-input v-model="form.equipmentEnv" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="培养安排">
          <el-input v-model="form.trainingPlan" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="考核要求">
          <el-input v-model="form.assessmentRequirement" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="开放日须知">
          <el-input v-model="form.openDayNote" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="leaderDialogVisible" title="设置实训室负责人" width="440px">
      <el-form label-width="90px">
        <el-form-item label="实训室">
          <span>{{ leaderLab?.labName }}</span>
        </el-form-item>
        <el-form-item label="负责人">
          <el-select v-model="leaderMentorId" placeholder="选择本室导师" class="full-width">
            <el-option
              v-for="mentor in leaderMentors"
              :key="mentor.id"
              :label="`${mentor.realName}（${mentor.title || '导师'}）`"
              :value="mentor.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="提拔理由">
          <el-input
            v-model="leaderReason"
            type="textarea"
            :rows="3"
            placeholder="必填，将写入操作日志"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="leaderDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingLeader" @click="handleAssignLeader">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  assignLabLeader,
  createLab,
  deleteLab,
  getLabDetail,
  listLabs,
  updateLab
} from '@/api/adminLab'
import { listMentors } from '@/api/adminMentor'
import type { LabDetail, LabListItem, LabSaveReq, MentorListItem } from '@/types/basic'

const loading = ref(false)
const saving = ref(false)
const labs = ref<LabListItem[]>([])
const keyword = ref('')
const statusFilter = ref<number | ''>('')

const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()

const leaderDialogVisible = ref(false)
const leaderLab = ref<LabListItem | null>(null)
const leaderMentorId = ref<number | null>(null)
const leaderReason = ref('')
const leaderMentors = ref<MentorListItem[]>([])
const savingLeader = ref(false)

function emptyForm(): LabSaveReq {
  return {
    labCode: '',
    labName: '',
    introduction: '',
    researchDirection: '',
    equipmentEnv: '',
    trainingPlan: '',
    assessmentRequirement: '',
    openDayDate: '',
    openDayStartTime: '',
    openDayEndTime: '',
    openDayLocation: '',
    openDayNote: '',
    totalQuota: 0,
    status: 1
  }
}

const form = reactive<LabSaveReq>(emptyForm())

const rules: FormRules<LabSaveReq> = {
  labCode: [{ required: true, message: '请输入实训室编码', trigger: 'blur' }],
  labName: [{ required: true, message: '请输入实训室名称', trigger: 'blur' }],
  totalQuota: [{ required: true, message: '请输入总名额', trigger: 'blur' }]
}

async function loadLabs() {
  loading.value = true
  try {
    const page = await listLabs({
      keyword: keyword.value.trim() || undefined,
      status: statusFilter.value === '' ? undefined : statusFilter.value,
      pageNum: 1,
      pageSize: 100
    })
    labs.value = page.list
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

function fillForm(detail: LabDetail) {
  Object.assign(form, {
    labCode: detail.labCode,
    labName: detail.labName,
    introduction: detail.introduction ?? '',
    researchDirection: detail.researchDirection ?? '',
    equipmentEnv: detail.equipmentEnv ?? '',
    trainingPlan: detail.trainingPlan ?? '',
    assessmentRequirement: detail.assessmentRequirement ?? '',
    openDayDate: detail.openDayDate ?? '',
    openDayStartTime: detail.openDayStartTime ?? '',
    openDayEndTime: detail.openDayEndTime ?? '',
    openDayLocation: detail.openDayLocation ?? '',
    openDayNote: detail.openDayNote ?? '',
    totalQuota: detail.totalQuota,
    status: detail.status
  })
}

function openCreate() {
  editingId.value = null
  Object.assign(form, emptyForm())
  dialogVisible.value = true
}

async function openEdit(lab: LabListItem) {
  editingId.value = lab.id
  try {
    fillForm(await getLabDetail(lab.id))
    dialogVisible.value = true
  } catch {
    // 错误提示已由请求层统一处理
  }
}

async function handleSave() {
  if (!formRef.value) {
    return
  }
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) {
    return
  }
  saving.value = true
  try {
    if (editingId.value === null) {
      await createLab({ ...form })
    } else {
      await updateLab(editingId.value, { ...form })
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    await loadLabs()
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    saving.value = false
  }
}

async function handleDelete(lab: LabListItem) {
  try {
    await ElMessageBox.confirm(`确定删除「${lab.labName}」吗？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deleteLab(lab.id)
    ElMessage.success('已删除')
    await loadLabs()
  } catch {
    // 错误提示已由请求层统一处理
  }
}

async function openLeader(lab: LabListItem) {
  leaderLab.value = lab
  leaderMentorId.value = null
  leaderReason.value = ''
  try {
    const page = await listMentors({ labId: lab.id, pageNum: 1, pageSize: 100 })
    leaderMentors.value = page.list
    leaderDialogVisible.value = true
  } catch {
    // 错误提示已由请求层统一处理
  }
}

async function handleAssignLeader() {
  if (!leaderLab.value || !leaderMentorId.value) {
    ElMessage.warning('请选择负责人')
    return
  }
  if (!leaderReason.value.trim()) {
    ElMessage.warning('请填写提拔理由')
    return
  }
  const mentor = leaderMentors.value.find((item) => item.id === leaderMentorId.value)
  if (!mentor) {
    ElMessage.warning('请选择本室导师')
    return
  }
  savingLeader.value = true
  try {
    await assignLabLeader(leaderLab.value.id, {
      userId: mentor.userId,
      reason: leaderReason.value.trim()
    })
    ElMessage.success('负责人已更新')
    leaderDialogVisible.value = false
    await loadLabs()
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    savingLeader.value = false
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

.filters {
  display: flex;
  gap: 12px;
}

.keyword {
  width: 240px;
}

.status {
  width: 140px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

.time-range {
  display: flex;
  align-items: center;
  gap: 8px;
}

.full-width {
  width: 100%;
}
</style>
