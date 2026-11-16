<template>
  <div class="page">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h2 class="page-title">实训室统筹</h2>
          <p class="page-desc">统筹实训室建档、组长绑定和招生进度。具体资料、教师与名额由各室组长维护。</p>
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
            <el-button size="small" text type="primary" @click="router.push(`/college/labs/${row.id}`)">查看与协调</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" title="新建实训室档案" width="640px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="实训室名称" prop="name">
          <el-input v-model="form.name" />
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
import type { LabView } from '@/types'

const router = useRouter()

const labs = ref<LabView[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const form = reactive({ name: '' })
const rules: FormRules = {
  name: [{ required: true, message: '请输入实训室名称', trigger: 'blur' }]
}

async function load() {
  loading.value = true
  try {
    labs.value = await collegeApi.labs()
  } finally {
    loading.value = false
  }
}

function openCreate() {
  form.name = ''
  dialogVisible.value = true
}

async function submit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      await collegeApi.createLab({ name: form.name })
      ElMessage.success('实训室档案已建立')
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
