<template>
  <div class="page">
    <div class="page-header">
      <el-tag size="small" effect="plain" class="stage-tag">阶段① · 集中宣讲</el-tag>
      <h1 class="page-title">宣讲视频管理</h1>
      <p class="page-desc">维护各实训室的宣讲视频。支持 MP4 直链、外链页面（B 站 / 校内平台）与内嵌页面。</p>
    </div>

    <el-card shadow="never">
      <template #header>
        <div class="toolbar">
          <span class="panel-title">视频列表（{{ rows.length }}）</span>
          <el-button type="primary" @click="openCreate">新增视频</el-button>
        </div>
      </template>

      <el-table v-loading="loading" :data="rows" border>
        <el-table-column prop="labName" label="实训室" min-width="160" />
        <el-table-column prop="title" label="标题" min-width="200" />
        <el-table-column label="类型" width="100">
          <template #default="{ row }">{{ typeLabel(row.videoType) }}</template>
        </el-table-column>
        <el-table-column prop="videoUrl" label="地址" min-width="260" show-overflow-tooltip />
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
          <el-empty description="暂无视频，点击右上角新增" />
        </template>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑宣讲视频' : '新增宣讲视频'" width="560px">
      <el-form :model="form" label-width="88px">
        <el-form-item label="实训室" required>
          <el-select v-model="form.labId" placeholder="请选择实训室" style="width: 100%">
            <el-option v-for="lab in labs" :key="lab.id" :label="lab.name" :value="lab.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题" required>
          <el-input v-model="form.title" maxlength="120" show-word-limit placeholder="如：AI 实训室 · 方向宣讲" />
        </el-form-item>
        <el-form-item label="类型">
          <el-radio-group v-model="form.videoType">
            <el-radio value="MP4">MP4 视频</el-radio>
            <el-radio value="LINK">外链页面</el-radio>
            <el-radio value="EMBED">内嵌页面</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="视频地址" required>
          <el-input v-model="form.videoUrl" placeholder="https://... 或 /media/xxx.mp4" />
        </el-form-item>
        <el-form-item label="封面地址">
          <el-input v-model="form.coverUrl" placeholder="可选，MP4 海报图" />
        </el-form-item>
        <el-form-item label="时长(秒)">
          <el-input-number v-model="form.durationSeconds" :min="0" :max="86400" />
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
        <el-form-item label="简介">
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
import type { LabView, VideoItem, VideoPayload } from '@/types'

interface VideoForm {
  labId: number
  title: string
  description: string
  videoType: string
  videoUrl: string
  coverUrl: string
  durationSeconds: number
  sortNo: number
  status: string
}

const emptyForm = (): VideoForm => ({
  labId: 0,
  title: '',
  description: '',
  videoType: 'MP4',
  videoUrl: '',
  coverUrl: '',
  durationSeconds: 0,
  sortNo: 0,
  status: 'PUBLISHED'
})

const loading = ref(false)
const saving = ref(false)
const rows = ref<VideoItem[]>([])
const labs = ref<LabView[]>([])
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const form = reactive<VideoForm>(emptyForm())

function typeLabel(type: string) {
  const map: Record<string, string> = { MP4: 'MP4', LINK: '外链', EMBED: '内嵌' }
  return map[type] || type
}

async function load() {
  loading.value = true
  try {
    rows.value = await mediaApi.adminVideos()
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

function openEdit(row: VideoItem) {
  editingId.value = row.id
  Object.assign(form, {
    labId: row.labId,
    title: row.title,
    description: row.description || '',
    videoType: row.videoType,
    videoUrl: row.videoUrl,
    coverUrl: row.coverUrl || '',
    durationSeconds: row.durationSeconds || 0,
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
  if (!form.title.trim()) {
    ElMessage.warning('请填写视频标题')
    return
  }
  if (!form.videoUrl.trim()) {
    ElMessage.warning('请填写视频地址')
    return
  }
  const payload: VideoPayload = {
    labId: form.labId,
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    videoType: form.videoType,
    videoUrl: form.videoUrl.trim(),
    coverUrl: form.coverUrl.trim() || undefined,
    durationSeconds: form.durationSeconds || undefined,
    sortNo: form.sortNo,
    status: form.status
  }
  saving.value = true
  try {
    if (editingId.value) {
      await mediaApi.updateVideo(editingId.value, payload)
      ElMessage.success('已保存')
    } else {
      await mediaApi.createVideo(payload)
      ElMessage.success('已新增')
    }
    dialogVisible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function remove(row: VideoItem) {
  try {
    await ElMessageBox.confirm(`确认删除「${row.title}」？`, '删除确认', { type: 'warning' })
  } catch {
    return
  }
  await mediaApi.deleteVideo(row.id)
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
