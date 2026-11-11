<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h2>学生账号</h2>
        <p class="subtitle">维护学生账号信息，支持批量导入、重置密码与启用禁用</p>
      </div>
      <div class="header-actions">
        <el-button plain @click="openImport">导入学生</el-button>
        <el-button type="primary" @click="openCreate">新增学生</el-button>
      </div>
    </div>

    <el-card shadow="never">
      <div class="filters">
        <el-input v-model="keyword" placeholder="学号 / 姓名" clearable class="keyword" />
        <el-select v-model="statusFilter" placeholder="全部状态" clearable class="status-select">
          <el-option label="启用" :value="1" />
          <el-option label="禁用" :value="0" />
        </el-select>
        <el-button type="primary" plain @click="loadData">查询</el-button>
      </div>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="students" stripe>
        <el-table-column prop="userNo" label="学号" width="120" />
        <el-table-column prop="realName" label="姓名" width="100" />
        <el-table-column prop="college" label="学院" min-width="140">
          <template #default="{ row }">{{ row.college || '-' }}</template>
        </el-table-column>
        <el-table-column prop="major" label="专业" min-width="160">
          <template #default="{ row }">{{ row.major || '-' }}</template>
        </el-table-column>
        <el-table-column prop="grade" label="年级" width="80">
          <template #default="{ row }">{{ row.grade || '-' }}</template>
        </el-table-column>
        <el-table-column label="账号状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="首登改密" width="100">
          <template #default="{ row }">
            <el-tag :type="row.needChangePwd === 1 ? 'warning' : 'info'">
              {{ row.needChangePwd === 1 ? '需改密' : '已改密' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button link type="warning" size="small" @click="resetPassword(row)">重置密码</el-button>
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

    <el-dialog
      v-model="formVisible"
      :title="editingId === null ? '新增学生' : '编辑学生'"
      width="520px"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="80px">
        <el-form-item label="学号" prop="userNo">
          <el-input v-model="form.userNo" :disabled="editingId !== null" placeholder="请输入学号" />
        </el-form-item>
        <el-form-item label="姓名" prop="realName">
          <el-input v-model="form.realName" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="学院" prop="college">
          <el-input v-model="form.college" placeholder="请输入学院" />
        </el-form-item>
        <el-form-item label="专业" prop="major">
          <el-input v-model="form.major" placeholder="请输入专业" />
        </el-form-item>
        <el-form-item label="年级" prop="grade">
          <el-input v-model="form.grade" placeholder="如 2022" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="importVisible" title="批量导入学生" width="540px">
      <el-upload
        :auto-upload="false"
        :limit="1"
        accept=".xlsx,.xls"
        :on-change="handleFileChange"
        :on-remove="handleFileRemove"
      >
        <el-button plain>选择 Excel 文件</el-button>
        <template #tip>
          <div class="upload-tip">列顺序：学号、姓名、学院、专业、年级、手机号、邮箱</div>
        </template>
      </el-upload>
      <div v-if="importResult" class="import-result">
        <p>
          成功 <strong>{{ importResult.successCount }}</strong> 条，失败
          <strong>{{ importResult.failCount }}</strong> 条
        </p>
        <el-table v-if="importResult.failList.length > 0" :data="importResult.failList" size="small">
          <el-table-column prop="row" label="行号" width="70" />
          <el-table-column prop="userNo" label="学号" width="120" />
          <el-table-column prop="reason" label="失败原因" />
        </el-table>
        <el-link v-if="importResult.failFileUrl" type="primary" :underline="false" :href="importResult.failFileUrl">
          下载失败明细
        </el-link>
      </div>
      <template #footer>
        <el-button @click="importVisible = false">关闭</el-button>
        <el-button type="primary" :loading="importing" :disabled="!importFileName" @click="handleImport">
          开始导入
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules, type UploadFile } from 'element-plus'
import {
  createStudent,
  importStudents,
  listStudents,
  resetStudentPassword,
  updateStudent,
  updateStudentStatus
} from '@/api/adminStudent'
import type { StudentImportResult, StudentListItem } from '@/types/basic'

interface StudentForm {
  userNo: string
  realName: string
  college: string
  major: string
  grade: string
  phone: string
  email: string
  status: number
}

const loading = ref(false)
const saving = ref(false)
const importing = ref(false)
const students = ref<StudentListItem[]>([])
const keyword = ref('')
const statusFilter = ref<number | ''>('')

const formVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const form = reactive<StudentForm>({
  userNo: '',
  realName: '',
  college: '',
  major: '',
  grade: '',
  phone: '',
  email: '',
  status: 1
})

const formRules: FormRules<StudentForm> = {
  userNo: [{ required: true, message: '请输入学号', trigger: 'blur' }],
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [
    {
      pattern: /^1\d{10}$/,
      message: '手机号格式不正确',
      trigger: 'blur'
    }
  ],
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }]
}

const importVisible = ref(false)
const importFile = ref<File | null>(null)
const importFileName = ref('')
const importResult = ref<StudentImportResult | null>(null)

async function loadData() {
  loading.value = true
  try {
    const page = await listStudents({
      keyword: keyword.value.trim() || undefined,
      status: statusFilter.value === '' ? undefined : statusFilter.value,
      pageNum: 1,
      pageSize: 100
    })
    students.value = page.list
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = null
  Object.assign(form, {
    userNo: '',
    realName: '',
    college: '',
    major: '',
    grade: '',
    phone: '',
    email: '',
    status: 1
  })
  formVisible.value = true
}

function openEdit(student: StudentListItem) {
  editingId.value = student.id
  Object.assign(form, {
    userNo: student.userNo,
    realName: student.realName,
    college: student.college ?? '',
    major: student.major ?? '',
    grade: student.grade ?? '',
    phone: student.phone ?? '',
    email: student.email ?? '',
    status: student.status
  })
  formVisible.value = true
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
      await createStudent({ ...form })
      ElMessage.success('学生账号已创建')
    } else {
      const { userNo: _userNo, ...payload } = form
      await updateStudent(editingId.value, payload)
      ElMessage.success('学生账号已更新')
    }
    formVisible.value = false
    await loadData()
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    saving.value = false
  }
}

async function toggleStatus(student: StudentListItem) {
  const nextStatus = student.status === 1 ? 0 : 1
  const actionText = nextStatus === 1 ? '启用' : '禁用'
  try {
    await ElMessageBox.confirm(`确定${actionText}「${student.realName}」的账号吗？`, '提示', {
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    await updateStudentStatus(student.id, nextStatus)
    ElMessage.success(`已${actionText}`)
    await loadData()
  } catch {
    // 错误提示已由请求层统一处理
  }
}

async function resetPassword(student: StudentListItem) {
  try {
    await ElMessageBox.confirm(
      `确定将「${student.realName}」的密码重置为系统初始密码吗？重置后需重新改密。`,
      '提示',
      { type: 'warning' }
    )
  } catch {
    return
  }
  try {
    await resetStudentPassword(student.id)
    ElMessage.success('密码已重置')
    await loadData()
  } catch {
    // 错误提示已由请求层统一处理
  }
}

function openImport() {
  importFile.value = null
  importFileName.value = ''
  importResult.value = null
  importVisible.value = true
}

function handleFileChange(file: UploadFile) {
  importFile.value = file.raw ?? null
  importFileName.value = file.name
  importResult.value = null
}

function handleFileRemove() {
  importFile.value = null
  importFileName.value = ''
  importResult.value = null
}

async function handleImport() {
  if (!importFile.value) {
    ElMessage.warning('请选择要导入的 Excel 文件')
    return
  }
  importing.value = true
  try {
    importResult.value = await importStudents(importFile.value)
    ElMessage.success('导入完成')
    await loadData()
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    importing.value = false
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

.header-actions {
  display: flex;
  gap: 12px;
}

.filters {
  display: flex;
  gap: 12px;
}

.keyword {
  width: 200px;
}

.status-select {
  width: 140px;
}

.upload-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}

.import-result {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
