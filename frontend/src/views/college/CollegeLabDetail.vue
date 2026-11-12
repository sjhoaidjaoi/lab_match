<template>
  <div class="page" v-loading="loading">
    <div class="page-header">
      <div class="header-row">
        <div class="title-with-back">
          <el-button text @click="router.push('/college/labs')">
            <el-icon><ArrowLeft /></el-icon>返回列表
          </el-button>
          <div>
            <h2 class="page-title">{{ lab?.name || '实训室详情' }}</h2>
            <p class="page-desc">查看实训室信息，并管理本实训室的组长与教师。</p>
          </div>
        </div>
        <el-button type="primary" @click="openLabEdit">编辑实训室</el-button>
      </div>
    </div>

    <el-card shadow="never" class="info-card">
      <el-descriptions :column="3" border>
        <el-descriptions-item label="实训室名称">{{ lab?.name }}</el-descriptions-item>
        <el-descriptions-item label="项目方向">{{ lab?.projectDirection || '—' }}</el-descriptions-item>
        <el-descriptions-item label="技术栈">{{ lab?.technologyStack || '—' }}</el-descriptions-item>
        <el-descriptions-item label="招生名额">{{ lab?.recruitmentQuota }}</el-descriptions-item>
        <el-descriptions-item label="当前报名">{{ lab?.applicationCount ?? 0 }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="lab?.status === 'ACTIVE' ? 'success' : 'info'" effect="light">
            {{ lab?.status === 'ACTIVE' ? '正常' : '停用' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="实训室简介" :span="3">{{ lab?.description || '—' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card shadow="never" class="leader-card">
      <div class="card-title">实训室组长</div>
      <div class="leader-row">
        <span class="muted">当前组长：</span>
        <el-tag v-if="leader" type="primary" effect="dark">{{ leader.realName }}（{{ leader.username }}）</el-tag>
        <span v-else class="muted">未绑定</span>
        <el-select v-model="leaderId" clearable placeholder="选择组长" style="width: 260px; margin-left: 16px">
          <el-option
            v-for="s in staff" :key="s.id"
            :label="`${s.realName}（${s.roleName || roleText(s.role)}${s.laboratoryId && s.laboratoryId !== labId ? ' · 其他实训室' : ''}）`"
            :value="s.id" :disabled="s.status !== 'ACTIVE'"
          />
        </el-select>
        <el-button type="primary" plain :loading="savingLeader" @click="saveLeader">保存</el-button>
      </div>
    </el-card>

    <el-card shadow="never">
      <div class="card-title-row">
        <div class="card-title">本实训室教师（{{ teachers.length }}）</div>
        <el-button type="primary" @click="openTeacherCreate">新增教师</el-button>
      </div>
      <el-table :data="teachers" stripe>
        <el-table-column prop="realName" label="姓名" width="120" />
        <el-table-column prop="username" label="登录账号" width="130" />
        <el-table-column prop="phone" label="联系电话" width="140">
          <template #default="{ row }">{{ row.phone || '—' }}</template>
        </el-table-column>
        <el-table-column label="角色" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="row.role === 'LAB_LEADER' ? 'warning' : 'primary'" effect="light">
              {{ roleText(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'" effect="light">
              {{ row.status === 'ACTIVE' ? '在职' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" align="center">
          <template #default="{ row }">
            <el-button size="small" text type="primary" @click="openTeacherEdit(row)">编辑</el-button>
            <el-button size="small" text type="warning" @click="resetPwd(row)">重置密码</el-button>
            <el-button v-if="row.status === 'ACTIVE'" size="small" text type="danger" @click="removeTeacher(row)">移除</el-button>
          </template>
        </el-table-column>
        <template #empty><span class="muted">本实训室暂无教师，点击右上角新增</span></template>
      </el-table>
    </el-card>

    <!-- 编辑实训室 -->
    <el-dialog v-model="labDialogVisible" title="编辑实训室" width="640px">
      <el-form ref="labFormRef" :model="labForm" :rules="labRules" label-width="100px">
        <el-form-item label="实训室名称" prop="name"><el-input v-model="labForm.name" /></el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="项目方向"><el-input v-model="labForm.projectDirection" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="招生名额" prop="recruitmentQuota">
              <el-input-number v-model="labForm.recruitmentQuota" :min="1" :max="100" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="技术栈"><el-input v-model="labForm.technologyStack" /></el-form-item>
        <el-form-item label="实训室简介"><el-input v-model="labForm.description" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="labForm.status">
            <el-radio value="ACTIVE">正常</el-radio>
            <el-radio value="INACTIVE">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="labDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitLab">保存</el-button>
      </template>
    </el-dialog>

    <!-- 新增/编辑教师 -->
    <el-dialog v-model="teacherDialogVisible" :title="teacherEditing ? '编辑教师' : '新增教师'" width="520px">
      <el-form ref="teacherFormRef" :model="teacherForm" :rules="teacherRules" label-width="90px">
        <template v-if="!teacherEditing">
          <el-form-item label="登录账号" prop="username">
            <el-input v-model="teacherForm.username" placeholder="如 T1004" />
          </el-form-item>
          <el-form-item label="初始密码">
            <el-input v-model="teacherForm.password" placeholder="默认 123456" />
          </el-form-item>
        </template>
        <el-form-item label="姓名" prop="realName"><el-input v-model="teacherForm.realName" /></el-form-item>
        <el-form-item label="联系电话"><el-input v-model="teacherForm.phone" /></el-form-item>
        <el-form-item v-if="teacherEditing" label="状态">
          <el-radio-group v-model="teacherForm.status">
            <el-radio value="ACTIVE">在职</el-radio>
            <el-radio value="INACTIVE">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="teacherDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitTeacher">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { collegeApi } from '@/api/college'
import type { LabView, UserAccount } from '@/types'

const route = useRoute()
const router = useRouter()
const labId = Number(route.params.id)

const lab = ref<LabView | null>(null)
const members = ref<UserAccount[]>([])
const staff = ref<UserAccount[]>([])
const loading = ref(false)
const submitting = ref(false)
const savingLeader = ref(false)
const leaderId = ref<number | null>(null)

const leader = computed(() => {
  if (!lab.value?.leaderId) return null
  return members.value.find((m) => m.id === lab.value?.leaderId) || staff.value.find((s) => s.id === lab.value?.leaderId) || null
})
const teachers = computed(() => members.value.filter((m) => m.role === 'LAB_TEACHER'))

function roleText(role: string) {
  return role === 'LAB_LEADER' ? '组长' : role === 'LAB_TEACHER' ? '教师' : role
}

async function load() {
  loading.value = true
  try {
    const [labs, memberList, staffList] = await Promise.all([
      collegeApi.labs(),
      collegeApi.users({ laboratoryId: labId }),
      collegeApi.staff()
    ])
    lab.value = labs.find((l) => l.id === labId) || null
    members.value = memberList.filter((m) => m.role === 'LAB_TEACHER' || m.role === 'LAB_LEADER')
    staff.value = staffList
    leaderId.value = lab.value?.leaderId ?? null
  } finally {
    loading.value = false
  }
}

// ---- 实训室编辑 ----
const labDialogVisible = ref(false)
const labFormRef = ref<FormInstance>()
const labForm = reactive({
  name: '', projectDirection: '', technologyStack: '', recruitmentQuota: 5,
  description: '', status: 'ACTIVE'
})
const labRules: FormRules = {
  name: [{ required: true, message: '请输入实训室名称', trigger: 'blur' }],
  recruitmentQuota: [{ required: true, message: '请设置招生名额', trigger: 'change' }]
}

function openLabEdit() {
  if (!lab.value) return
  Object.assign(labForm, {
    name: lab.value.name, projectDirection: lab.value.projectDirection || '',
    technologyStack: lab.value.technologyStack || '', recruitmentQuota: lab.value.recruitmentQuota,
    description: lab.value.description || '', status: lab.value.status
  })
  labDialogVisible.value = true
}

async function submitLab() {
  if (!labFormRef.value) return
  await labFormRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      await collegeApi.updateLab(labId, { ...labForm })
      ElMessage.success('实训室信息已更新')
      labDialogVisible.value = false
      await load()
    } finally {
      submitting.value = false
    }
  })
}

// ---- 组长 ----
async function saveLeader() {
  savingLeader.value = true
  try {
    await collegeApi.updateLab(labId, { leaderId: leaderId.value })
    ElMessage.success('组长已更新')
    await load()
  } finally {
    savingLeader.value = false
  }
}

// ---- 教师 ----
const teacherDialogVisible = ref(false)
const teacherEditing = ref<UserAccount | null>(null)
const teacherFormRef = ref<FormInstance>()
const teacherForm = reactive({ username: '', password: '123456', realName: '', phone: '', status: 'ACTIVE' })
const teacherRules: FormRules = {
  username: [{ required: true, message: '请输入登录账号', trigger: 'blur' }],
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }]
}

function openTeacherCreate() {
  teacherEditing.value = null
  Object.assign(teacherForm, { username: '', password: '123456', realName: '', phone: '', status: 'ACTIVE' })
  teacherDialogVisible.value = true
}

function openTeacherEdit(row: UserAccount) {
  teacherEditing.value = row
  Object.assign(teacherForm, {
    username: row.username, password: '123456',
    realName: row.realName, phone: row.phone || '', status: row.status
  })
  teacherDialogVisible.value = true
}

async function submitTeacher() {
  if (!teacherFormRef.value) return
  await teacherFormRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      if (teacherEditing.value) {
        await collegeApi.updateUser(teacherEditing.value.id, {
          realName: teacherForm.realName, phone: teacherForm.phone || null, status: teacherForm.status
        })
        ElMessage.success('教师信息已更新')
      } else {
        await collegeApi.createUser({
          username: teacherForm.username, password: teacherForm.password || '123456',
          realName: teacherForm.realName, phone: teacherForm.phone || null,
          role: 'LAB_TEACHER', laboratoryId: labId, status: 'ACTIVE'
        })
        ElMessage.success('教师已新增，默认密码 ' + (teacherForm.password || '123456'))
      }
      teacherDialogVisible.value = false
      await load()
    } finally {
      submitting.value = false
    }
  })
}

async function resetPwd(row: UserAccount) {
  await ElMessageBox.confirm(`确认将 ${row.realName} 的密码重置为 123456？`, '重置密码', { type: 'warning' })
  await collegeApi.resetPassword(row.id, '123456')
  ElMessage.success('密码已重置为 123456')
}

async function removeTeacher(row: UserAccount) {
  await ElMessageBox.confirm(`确认将 ${row.realName} 从本实训室移除（账号停用）？`, '移除教师', { type: 'warning' })
  if (lab.value?.leaderId === row.id) {
    await collegeApi.updateLab(labId, { leaderId: null })
  }
  await collegeApi.disableUser(row.id)
  ElMessage.success('已移除')
  await load()
}

onMounted(load)
</script>

<style scoped>
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.title-with-back { display: flex; align-items: flex-start; gap: 8px; }
.info-card { margin-bottom: 16px; }
.leader-card { margin-bottom: 16px; }
.card-title { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
.card-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.card-title-row .card-title { margin-bottom: 0; }
.leader-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.muted { color: var(--lm-text-secondary); font-size: 13px; }
</style>
