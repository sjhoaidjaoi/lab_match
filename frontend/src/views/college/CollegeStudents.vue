<template>
  <div class="page">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h2 class="page-title">学生管理</h2>
          <p class="page-desc">维护学生账号；停用后无法登录，但保留其志愿与录取数据。</p>
        </div>
        <div class="tools">
          <el-input v-model="keyword" placeholder="学号 / 姓名" clearable style="width: 200px" @keyup.enter="load" @clear="load" />
          <el-button @click="openImport">批量导入</el-button>
          <el-button type="primary" @click="openCreate">新增学生</el-button>
        </div>
      </div>
    </div>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="students" stripe>
        <el-table-column prop="studentNumber" label="学号" width="130" />
        <el-table-column prop="realName" label="姓名" width="110" />
        <el-table-column prop="phone" label="联系电话" width="140">
          <template #default="{ row }">{{ row.phone || '—' }}</template>
        </el-table-column>
        <el-table-column prop="username" label="登录账号" min-width="130" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'danger'" effect="light">
              {{ row.status === 'ACTIVE' ? '正常' : '已停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="230" align="center">
          <template #default="{ row }">
            <el-button size="small" text type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" text @click="resetPwd(row)">重置密码</el-button>
            <el-button v-if="row.status === 'ACTIVE'" size="small" text type="danger" @click="disable(row)">停用</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑学生' : '新增学生'" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="学号" prop="username">
          <el-input v-model="form.username" :disabled="editing" placeholder="学号同时作为登录账号" />
        </el-form-item>
        <el-form-item label="姓名" prop="realName">
          <el-input v-model="form.realName" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item v-if="!editing" label="初始密码">
          <el-input v-model="form.password" placeholder="默认 123456" />
        </el-form-item>
        <el-form-item v-if="editing" label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="ACTIVE">正常</el-radio>
            <el-radio value="INACTIVE">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="importVisible" title="批量导入学生" width="720px">
      <el-alert
        type="info" :closable="false" show-icon class="import-tip"
        title="支持 .xlsx / .xls / .csv，表头需包含「学号」「姓名」，可选「联系电话」"
      >
        <template #default>
          <el-button size="small" text type="primary" @click="downloadTemplate">下载导入模板</el-button>
        </template>
      </el-alert>
      <el-upload
        drag :auto-upload="false" :show-file-list="false" accept=".xlsx,.xls,.csv"
        :on-change="onFileChange"
      >
        <div class="upload-text">将文件拖到此处，或<em>点击选择文件</em></div>
      </el-upload>
      <template v-if="importRows.length || importErrors.length">
        <div class="preview-title">解析结果：可导入 {{ importRows.length }} 条<span v-if="importErrors.length">，异常 {{ importErrors.length }} 条</span></div>
        <el-alert v-if="importErrors.length" type="warning" :closable="false">
          <div v-for="e in importErrors" :key="e">{{ e }}</div>
        </el-alert>
        <el-table :data="importRows" size="small" max-height="260" stripe>
          <el-table-column prop="studentNumber" label="学号" width="140" />
          <el-table-column prop="realName" label="姓名" width="120" />
          <el-table-column prop="phone" label="联系电话" />
        </el-table>
      </template>
      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button type="primary" :loading="importing" :disabled="!importRows.length" @click="submitImport">
          确认导入
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules, type UploadFile } from 'element-plus'
import { collegeApi } from '@/api/college'
import type { UserAccount } from '@/types'
import { exportExcel, formatTime } from './shared'

const students = ref<UserAccount[]>([])
const loading = ref(false)
const keyword = ref('')
const dialogVisible = ref(false)
const submitting = ref(false)
const editing = ref<UserAccount | null>(null)
const formRef = ref<FormInstance>()
const form = reactive({ username: '', realName: '', phone: '', password: '123456', status: 'ACTIVE' })
const rules: FormRules = {
  username: [{ required: true, message: '请输入学号', trigger: 'blur' }],
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }]
}

async function load() {
  loading.value = true
  try {
    students.value = await collegeApi.users({ role: 'STUDENT', keyword: keyword.value })
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  Object.assign(form, { username: '', realName: '', phone: '', password: '123456', status: 'ACTIVE' })
  dialogVisible.value = true
}

function openEdit(row: UserAccount) {
  editing.value = row
  Object.assign(form, {
    username: row.username, realName: row.realName, phone: row.phone || '',
    password: '', status: row.status
  })
  dialogVisible.value = true
}

async function submit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      if (editing.value) {
        await collegeApi.updateUser(editing.value.id, {
          realName: form.realName, phone: form.phone, status: form.status
        })
        ElMessage.success('学生信息已更新')
      } else {
        await collegeApi.createUser({
          username: form.username, realName: form.realName, phone: form.phone,
          password: form.password || '123456', role: 'STUDENT', studentNumber: form.username
        })
        ElMessage.success('学生账号已创建')
      }
      dialogVisible.value = false
      await load()
    } finally {
      submitting.value = false
    }
  })
}

async function resetPwd(row: UserAccount) {
  const { value } = await ElMessageBox.prompt(`为 ${row.realName} 设置新密码`, '重置密码', {
    inputValue: '123456',
    inputPattern: /^.{6,}$/,
    inputErrorMessage: '密码至少 6 位'
  })
  await collegeApi.resetPassword(row.id, value)
  ElMessage.success('密码已重置')
}

async function disable(row: UserAccount) {
  await ElMessageBox.confirm(`确认停用学生「${row.realName}」的账号？`, '停用账号', { type: 'warning' })
  await collegeApi.disableUser(row.id)
  ElMessage.success('账号已停用')
  await load()
}

// ---- 批量导入 ----
const importVisible = ref(false)
const importing = ref(false)
const importRows = ref<Array<{ studentNumber: string; realName: string; phone: string }>>([])
const importErrors = ref<string[]>([])

function openImport() {
  importRows.value = []
  importErrors.value = []
  importVisible.value = true
}

function downloadTemplate() {
  exportExcel('学生导入模板.xlsx', ['学号', '姓名', '联系电话'], [['2023001', '张三', '13800000000']])
}

async function onFileChange(file: UploadFile) {
  const raw = file.raw
  if (!raw) return
  try {
    const XLSX = await import('xlsx')
    const buffer = await raw.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
    const rows: Array<{ studentNumber: string; realName: string; phone: string }> = []
    const errors: string[] = []
    json.forEach((r, i) => {
      const studentNumber = String(r['学号'] ?? r.studentNumber ?? r['StudentNumber'] ?? '').trim()
      const realName = String(r['姓名'] ?? r.realName ?? r['Name'] ?? '').trim()
      const phone = String(r['联系电话'] ?? r['手机号'] ?? r.phone ?? '').trim()
      if (!studentNumber || !realName) {
        errors.push(`第 ${i + 2} 行缺少学号或姓名，已跳过`)
        return
      }
      rows.push({ studentNumber, realName, phone })
    })
    importRows.value = rows
    importErrors.value = errors
    if (!rows.length) ElMessage.warning('未解析到有效数据，请检查表头是否为「学号」「姓名」')
  } catch {
    ElMessage.error('文件解析失败，请使用 Excel 或 CSV 文件')
  }
}

async function submitImport() {
  importing.value = true
  try {
    const res = await collegeApi.importStudents(importRows.value)
    const skipped = res.skipped || []
    ElMessage.success(`成功导入 ${res.created} 个学生账号${skipped.length ? `，跳过 ${skipped.length} 个` : ''}`)
    if (skipped.length) {
      importErrors.value = skipped.map((s) => `${s.studentNumber} ${s.realName}：${s.reason}`)
    } else {
      importVisible.value = false
    }
    await load()
  } finally {
    importing.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.tools { display: flex; gap: 10px; }
.import-tip { margin-bottom: 12px; }
.preview-title { margin: 14px 0 8px; font-size: 13px; color: var(--lm-text-secondary); }
.upload-text { font-size: 13px; color: var(--lm-text-secondary); }
.upload-text em { color: #2f6fed; font-style: normal; }
</style>
