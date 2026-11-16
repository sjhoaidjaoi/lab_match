<template>
  <div class="page">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h2 class="page-title">选拔批次管理</h2>
          <p class="page-desc">维护每学年的实训室选拔批次，创建后自动生成八阶段时间窗。</p>
        </div>
        <el-button type="primary" @click="openCreate">新建选拔批次</el-button>
      </div>
    </div>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="batches" stripe>
        <el-table-column prop="batchName" label="批次名称" min-width="200" />
        <el-table-column prop="academicYear" label="学年" width="130" />
        <el-table-column prop="description" label="说明" min-width="220" show-overflow-tooltip />
        <el-table-column label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'IN_PROGRESS' ? 'success' : 'info'" effect="light">
              {{ row.status === 'IN_PROGRESS' ? '进行中' : '已结束' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" align="center">
          <template #default="{ row }">
            <el-button size="small" text type="primary" @click="router.push({ path: '/college/stages', query: { batchId: row.id } })">
              阶段时间
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" title="新建选拔批次" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="批次名称" prop="batchName">
          <el-input v-model="form.batchName" placeholder="如：2027 届实训室选拔" />
        </el-form-item>
        <el-form-item label="学年" prop="academicYear">
          <el-input v-model="form.academicYear" placeholder="如：2026-2027" />
        </el-form-item>
        <el-form-item label="批次说明">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="选填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { collegeApi } from '@/api/college'
import type { BatchInfo } from '@/types'
import { formatTime } from './shared'

const router = useRouter()
const batches = ref<BatchInfo[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const form = reactive({ batchName: '', academicYear: '', description: '' })
const rules: FormRules = {
  batchName: [{ required: true, message: '请输入批次名称', trigger: 'blur' }],
  academicYear: [{ required: true, message: '请输入学年', trigger: 'blur' }]
}

async function load() {
  loading.value = true
  try {
    batches.value = await collegeApi.batches()
  } finally {
    loading.value = false
  }
}

function openCreate() {
  form.batchName = ''
  form.academicYear = ''
  form.description = ''
  dialogVisible.value = true
}

async function submit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      await collegeApi.createBatch({ ...form })
      ElMessage.success('批次已创建，八阶段时间窗已自动生成')
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
