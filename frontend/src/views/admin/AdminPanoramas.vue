<template>
  <div class="page">
    <div class="page-header">
      <el-tag size="small" effect="plain" class="stage-tag">阶段② · 实训室开放日</el-tag>
      <h1 class="page-title">全景资源管理</h1>
      <p class="page-desc">维护各实训室的 720° 全景云游资源，支持第三方全景作品链接与等距柱状全景图直链。</p>
    </div>

    <el-card shadow="never">
      <template #header>
        <div class="toolbar">
          <span class="panel-title">全景资源（{{ rows.length }}）</span>
          <el-button type="primary" @click="openCreate">新增全景</el-button>
        </div>
      </template>

      <el-table v-loading="loading" :data="rows" border>
        <el-table-column prop="labName" label="实训室" min-width="160" />
        <el-table-column prop="name" label="名称" min-width="200" />
        <el-table-column label="类型" width="110">
          <template #default="{ row }">{{ typeLabel(row.panoramaType) }}</template>
        </el-table-column>
        <el-table-column prop="panoramaUrl" label="地址" min-width="260" show-overflow-tooltip />
        <el-table-column prop="sortNo" label="排序" width="80" align="center" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'PUBLISHED' ? 'success' : 'info'" size="small">
              {{ row.status === 'PUBLISHED' ? '已发布' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无全景资源，点击右上角新增" />
        </template>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑全景资源' : '新增全景资源'" width="560px">
      <el-form :model="form" label-width="96px">
        <el-form-item label="实训室" required>
          <el-select v-model="form.labId" placeholder="请选择实训室" style="width: 100%">
            <el-option v-for="lab in labs" :key="lab.id" :label="lab.name" :value="lab.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="名称" required>
          <el-input v-model="form.name" maxlength="120" show-word-limit placeholder="如：AI 实训室 · 720° 全景" />
        </el-form-item>
        <el-form-item label="类型">
          <el-radio-group v-model="form.panoramaType">
            <el-radio value="LINK">第三方全景链接</el-radio>
            <el-radio value="IMAGE">全景图片直链</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="全景地址" required>
          <el-input
            v-model="form.panoramaUrl"
            :placeholder="form.panoramaType === 'LINK' ? 'https://www.720yun.com/...' : 'https://.../pano.jpg'"
          />
        </el-form-item>
        <el-form-item label="封面地址">
          <el-input v-model="form.coverUrl" placeholder="可选，卡片封面图" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sortNo" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="PUBLISHED">发布</el-radio>
            <el-radio value="DRAFT">草稿</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="form.description" type="textarea" :rows="3" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { mediaApi } from '@/api/media'
import { catalogApi } from '@/api/catalog'
import type { LabView, PanoramaItem, PanoramaPayload } from '@/types'

interface PanoramaForm {
  labId: number
  name: string
  description: string
  panoramaType: string
  panoramaUrl: string
  coverUrl: string
  sortNo: number
  status: string
}

const emptyForm = (): PanoramaForm => ({
  labId: 0,
  name: '',
  description: '',
  panoramaType: 'LINK',
  panoramaUrl: '',
  coverUrl: '',
  sortNo: 0,
  status: 'PUBLISHED'
})

const loading = ref(false)
const saving = ref(false)
const rows = ref<PanoramaItem[]>([])
const labs = ref<LabView[]>([])
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const form = reactive<PanoramaForm>(emptyForm())

function typeLabel(type: string) {
  const map: Record<string, string> = { LINK: '全景链接', IMAGE: '全景图' }
  return map[type] || type
}

async function load() {
  loading.value = true
  try {
    rows.value = await mediaApi.adminPanoramas()
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = null
  Object.assign(form, emptyForm())
  form.labId = labs.value[0]?.id || 0
  dialogVisible.value = true
}

function openEdit(row: PanoramaItem) {
  editingId.value = row.id
  Object.assign(form, {
    labId: row.labId,
    name: row.name,
    description: row.description || '',
    panoramaType: row.panoramaType,
    panoramaUrl: row.panoramaUrl,
    coverUrl: row.coverUrl || '',
    sortNo: row.sortNo || 0,
    status: row.status
  })
  dialogVisible.value = true
}

async function submit() {
  if (!form.labId) {
    ElMessage.warning('请选择实训室')
    return
  }
  if (!form.name.trim()) {
    ElMessage.warning('请填写全景名称')
    return
  }
  if (!form.panoramaUrl.trim()) {
    ElMessage.warning('请填写全景地址')
    return
  }
  const payload: PanoramaPayload = {
    labId: form.labId,
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    panoramaType: form.panoramaType,
    panoramaUrl: form.panoramaUrl.trim(),
    coverUrl: form.coverUrl.trim() || undefined,
    sortNo: form.sortNo,
    status: form.status
  }
  saving.value = true
  try {
    if (editingId.value) {
      await mediaApi.updatePanorama(editingId.value, payload)
      ElMessage.success('已保存')
    } else {
      await mediaApi.createPanorama(payload)
      ElMessage.success('已新增')
    }
    dialogVisible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function remove(row: PanoramaItem) {
  try {
    await ElMessageBox.confirm(`确认删除「${row.name}」？`, '删除确认', { type: 'warning' })
  } catch {
    return
  }
  await mediaApi.deletePanorama(row.id)
  ElMessage.success('已删除')
  await load()
}

onMounted(async () => {
  labs.value = await catalogApi.labs()
  await load()
})
</script>

<style scoped>
.stage-tag {
  margin-bottom: 10px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-title {
  font-weight: 600;
}
</style>
