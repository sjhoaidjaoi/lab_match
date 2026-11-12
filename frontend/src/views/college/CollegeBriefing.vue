<template>
  <div class="page">
    <div class="page-header">
      <h2 class="page-title">集中宣讲管理</h2>
      <p class="page-desc">为每个实训室维护宣讲文字介绍与教师线下宣讲录制视频（引用外部地址），学生端「集中宣讲」按实训室展示。</p>
    </div>

    <el-tabs v-model="tab">
      <el-tab-pane label="实训室宣讲内容" name="labs">
        <el-table v-loading="loading" :data="labs" stripe>
          <el-table-column prop="name" label="实训室" min-width="200" />
          <el-table-column label="宣讲文字介绍" min-width="340">
            <template #default="{ row }">
              <span v-if="row.briefingText" class="ellipsis-text">{{ row.briefingText }}</span>
              <span v-else class="muted">未填写</span>
            </template>
          </el-table-column>
          <el-table-column label="宣讲视频" min-width="240">
            <template #default="{ row }">
              <span v-if="row.briefingVideoUrl" class="video-url">{{ row.briefingVideoUrl }}</span>
              <span v-else class="muted">未配置</span>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="90" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.briefingVideoUrl" size="small" effect="light">{{ VIDEO_TYPE_LABELS[row.briefingVideoType || 'LINK'] }}</el-tag>
              <span v-else class="muted">—</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160" align="center">
            <template #default="{ row }">
              <el-button size="small" text type="primary" :disabled="!row.briefingText && !row.briefingVideoUrl" @click="openPreview(row)">预览</el-button>
              <el-button size="small" text type="primary" @click="openEdit(row)">编辑</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="宣讲公告" name="notice">
        <div class="tab-toolbar">
          <el-button type="primary" @click="openNotice()">新增公告</el-button>
        </div>
        <el-table v-loading="loading" :data="announcements" stripe>
          <el-table-column prop="title" label="标题" min-width="220" />
          <el-table-column prop="content" label="内容" min-width="280" show-overflow-tooltip />
          <el-table-column label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 'PUBLISHED' ? 'success' : 'info'" effect="light">
                {{ row.status === 'PUBLISHED' ? '已发布' : '草稿' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="发布时间" width="170">
            <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="150" align="center">
            <template #default="{ row }">
              <el-button size="small" text type="primary" @click="openNotice(row)">编辑</el-button>
              <el-button size="small" text type="danger" @click="removeNotice(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 编辑宣讲内容 -->
    <el-dialog v-model="editVisible" :title="`编辑宣讲内容 · ${editingLab?.name || ''}`" width="720px">
      <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="100px">
        <el-form-item label="文字介绍" prop="briefingText">
          <el-input
            v-model="editForm.briefingText" type="textarea" :rows="8"
            placeholder="介绍实训室的研究方向、培养目标、项目资源、入组要求等"
          />
        </el-form-item>
        <el-form-item label="视频类型">
          <el-radio-group v-model="editForm.briefingVideoType">
            <el-radio value="MP4">MP4 直链</el-radio>
            <el-radio value="LINK">外链页面</el-radio>
            <el-radio value="EMBED">内嵌地址</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="视频地址">
          <el-input v-model="editForm.briefingVideoUrl" placeholder="粘贴录制视频地址，如 https://.../briefing.mp4 或视频页面链接" />
          <div class="form-tip">
            MP4 直链可在页面内直接播放；外链页面点击后在新窗口打开；内嵌地址（如 B 站播放器 embed 链接）在页面内以 iframe 播放。
          </div>
        </el-form-item>
        <el-form-item v-if="editForm.briefingVideoUrl" label="视频预览">
          <div class="video-box">
            <video v-if="editForm.briefingVideoType === 'MP4'" :src="editForm.briefingVideoUrl" controls class="video-player" />
            <iframe v-else-if="editForm.briefingVideoType === 'EMBED'" :src="editForm.briefingVideoUrl" class="video-frame" allowfullscreen />
            <a v-else :href="editForm.briefingVideoUrl" target="_blank" rel="noopener">在新窗口打开视频</a>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 预览（学生视角） -->
    <el-dialog v-model="previewVisible" :title="`宣讲预览 · ${previewLab?.name || ''}`" width="820px">
      <div v-if="previewLab" class="preview-body">
        <div class="preview-text">{{ previewLab.briefingText || '暂无文字介绍' }}</div>
        <div v-if="previewLab.briefingVideoUrl" class="video-box">
          <video v-if="previewLab.briefingVideoType === 'MP4'" :src="previewLab.briefingVideoUrl" controls class="video-player" />
          <iframe v-else-if="previewLab.briefingVideoType === 'EMBED'" :src="previewLab.briefingVideoUrl" class="video-frame" allowfullscreen />
          <a v-else :href="previewLab.briefingVideoUrl" target="_blank" rel="noopener">在新窗口打开宣讲视频</a>
        </div>
        <div v-else class="muted">暂未配置宣讲视频</div>
      </div>
    </el-dialog>

    <!-- 公告编辑 -->
    <el-dialog v-model="noticeVisible" :title="noticeEditing ? '编辑公告' : '新增公告'" width="560px">
      <el-form ref="noticeFormRef" :model="noticeForm" :rules="noticeRules" label-width="80px">
        <el-form-item label="标题" prop="title"><el-input v-model="noticeForm.title" /></el-form-item>
        <el-form-item label="内容"><el-input v-model="noticeForm.content" type="textarea" :rows="4" /></el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="noticeForm.status">
            <el-radio value="PUBLISHED">发布</el-radio>
            <el-radio value="DRAFT">草稿</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="noticeVisible = false">取消</el-button>
        <el-button type="primary" @click="saveNotice">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { collegeApi } from '@/api/college'
import type { AnnouncementItem, LabView } from '@/types'
import { formatTime } from './shared'

const VIDEO_TYPE_LABELS: Record<string, string> = { MP4: 'MP4 直链', LINK: '外链页面', EMBED: '内嵌' }

const tab = ref('labs')
const loading = ref(false)
const saving = ref(false)
const announcements = ref<AnnouncementItem[]>([])
const labs = ref<LabView[]>([])

const editVisible = ref(false)
const editingLab = ref<LabView | null>(null)
const editFormRef = ref<FormInstance>()
const editForm = reactive({
  briefingText: '',
  briefingVideoUrl: '',
  briefingVideoType: 'MP4' as 'MP4' | 'LINK' | 'EMBED'
})
const editRules: FormRules = {
  briefingText: [{ required: true, message: '请填写宣讲文字介绍', trigger: 'blur' }]
}

const previewVisible = ref(false)
const previewLab = ref<LabView | null>(null)

const noticeVisible = ref(false)
const noticeEditing = ref<AnnouncementItem | null>(null)
const noticeFormRef = ref<FormInstance>()
const noticeForm = reactive({ title: '', content: '', status: 'PUBLISHED' })
const noticeRules: FormRules = { title: [{ required: true, message: '请输入标题', trigger: 'blur' }] }

async function load() {
  loading.value = true
  try {
    const [a, l] = await Promise.all([collegeApi.announcements(), collegeApi.labs()])
    announcements.value = a
    labs.value = l
  } finally {
    loading.value = false
  }
}

function openEdit(row: LabView) {
  editingLab.value = row
  Object.assign(editForm, {
    briefingText: row.briefingText || '',
    briefingVideoUrl: row.briefingVideoUrl || '',
    briefingVideoType: row.briefingVideoType || 'MP4'
  })
  editVisible.value = true
}

async function saveEdit() {
  if (!editFormRef.value || !editingLab.value) return
  await editFormRef.value.validate(async (valid) => {
    if (!valid) return
    saving.value = true
    try {
      await collegeApi.updateLab(editingLab.value!.id, {
        briefingText: editForm.briefingText,
        briefingVideoUrl: editForm.briefingVideoUrl || null,
        briefingVideoType: editForm.briefingVideoType
      })
      ElMessage.success('宣讲内容已保存')
      editVisible.value = false
      await load()
    } finally {
      saving.value = false
    }
  })
}

function openPreview(row: LabView) {
  previewLab.value = row
  previewVisible.value = true
}

function openNotice(row?: AnnouncementItem) {
  noticeEditing.value = row || null
  Object.assign(noticeForm, { title: row?.title || '', content: row?.content || '', status: row?.status || 'PUBLISHED' })
  noticeVisible.value = true
}

async function saveNotice() {
  if (!noticeFormRef.value) return
  await noticeFormRef.value.validate(async (valid) => {
    if (!valid) return
    if (noticeEditing.value) {
      await collegeApi.updateAnnouncement(noticeEditing.value.id, { ...noticeForm })
      ElMessage.success('公告已更新')
    } else {
      await collegeApi.createAnnouncement({ ...noticeForm })
      ElMessage.success('公告已发布')
    }
    noticeVisible.value = false
    await load()
  })
}

async function removeNotice(row: AnnouncementItem) {
  await ElMessageBox.confirm(`确认删除公告「${row.title}」？`, '删除公告', { type: 'warning' })
  await collegeApi.deleteAnnouncement(row.id)
  ElMessage.success('已删除')
  await load()
}

onMounted(load)
</script>

<style scoped>
.tab-toolbar { display: flex; justify-content: flex-end; margin-bottom: 12px; }
.ellipsis-text { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.video-url { color: #2f6fed; word-break: break-all; font-size: 12.5px; }
.muted { color: var(--lm-text-secondary); font-size: 12.5px; }
.form-tip { margin-top: 6px; font-size: 12px; color: var(--lm-text-secondary); line-height: 1.6; }
.video-box { width: 100%; }
.video-player { width: 100%; max-height: 360px; border-radius: 8px; background: #000; }
.video-frame { width: 100%; height: 360px; border: none; border-radius: 8px; }
.preview-body { display: flex; flex-direction: column; gap: 16px; }
.preview-text { white-space: pre-wrap; line-height: 1.8; color: #374151; font-size: 13.5px; }
</style>
