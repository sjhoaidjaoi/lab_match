<template>
  <div class="page">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h2 class="page-title">实训室管理</h2>
          <p class="page-desc">维护实训室方向、技术栈、招生名额与负责人；点击实训室名称或「成员管理」可维护本实训室的组长与教师。</p>
        </div>
        <el-button type="primary" @click="openCreate">新增实训室</el-button>
      </div>
    </div>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="labs" stripe>
        <el-table-column label="实训室" min-width="210">
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="router.push(`/college/labs/${row.id}`)">
              {{ row.name }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="projectDirection" label="项目方向" min-width="160" show-overflow-tooltip />
        <el-table-column prop="technologyStack" label="技术栈" min-width="180" show-overflow-tooltip />
        <el-table-column label="负责人" width="100" align="center">
          <template #default="{ row }">{{ row.leaderName || '未绑定' }}</template>
        </el-table-column>
        <el-table-column prop="recruitmentQuota" label="招生名额" width="95" align="center" />
        <el-table-column prop="applicationCount" label="当前报名" width="95" align="center" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'" effect="light">
              {{ row.status === 'ACTIVE' ? '正常' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="center">
          <template #default="{ row }">
            <el-button size="small" text type="primary" @click="router.push(`/college/labs/${row.id}`)">成员管理</el-button>
            <el-button size="small" text type="primary" @click="openEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑实训室' : '新增实训室'" width="640px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="实训室名称" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="项目方向">
              <el-input v-model="form.projectDirection" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="招生名额" prop="recruitmentQuota">
              <el-input-number v-model="form.recruitmentQuota" :min="1" :max="100" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="技术栈">
          <el-input v-model="form.technologyStack" placeholder="如：Java / Spring Boot / Vue3" />
        </el-form-item>
        <el-form-item label="负责人">
          <el-select v-model="form.leaderId" clearable placeholder="从教师/组长中选择" style="width: 100%">
            <el-option v-for="s in staff" :key="s.id" :label="`${s.realName}（${s.roleName}）`" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="实训室简介">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="状态">
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
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { collegeApi } from '@/api/college'
import type { LabView, UserAccount } from '@/types'

const router = useRouter()

const labs = ref<LabView[]>([])
const staff = ref<UserAccount[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const submitting = ref(false)
const editing = ref<LabView | null>(null)
const formRef = ref<FormInstance>()
const form = reactive({
  name: '', projectDirection: '', technologyStack: '', recruitmentQuota: 5,
  leaderId: null as number | null, description: '', status: 'ACTIVE'
})
const rules: FormRules = {
  name: [{ required: true, message: '请输入实训室名称', trigger: 'blur' }],
  recruitmentQuota: [{ required: true, message: '请设置招生名额', trigger: 'change' }]
}

async function load() {
  loading.value = true
  try {
    const [labList, staffList] = await Promise.all([collegeApi.labs(), collegeApi.staff()])
    labs.value = labList
    staff.value = staffList
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  Object.assign(form, {
    name: '', projectDirection: '', technologyStack: '', recruitmentQuota: 5,
    leaderId: null, description: '', status: 'ACTIVE'
  })
  dialogVisible.value = true
}

function openEdit(row: LabView) {
  editing.value = row
  Object.assign(form, {
    name: row.name, projectDirection: row.projectDirection || '',
    technologyStack: row.technologyStack || '', recruitmentQuota: row.recruitmentQuota,
    leaderId: row.leaderId ?? null, description: row.description || '', status: row.status
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
        await collegeApi.updateLab(editing.value.id, { ...form })
        ElMessage.success('实训室信息已更新')
      } else {
        await collegeApi.createLab({ ...form })
        ElMessage.success('实训室已新增')
      }
      dialogVisible.value = false
      await load()
    } finally {
      submitting.value = false
    }
  })
}

onMounted(load)
</script>

<style scoped>
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
</style>
