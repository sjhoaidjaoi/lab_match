<template>
  <div class="promo-files">
    <div v-if="editable && !isPreset" class="promo-toolbar">
      <div class="promo-hint">
        <span class="promo-title">宣传资料</span>
        <span class="promo-desc">支持 PPT / PDF / Word / 视频 / 图片，单个文件不超过 {{ MAX_MB }} MB</span>
      </div>
      <div class="promo-actions">
        <el-progress v-if="uploading" :percentage="progress" :stroke-width="6" class="promo-progress" />
        <el-button type="primary" :loading="uploading" @click="pickFile">
          上传资料
        </el-button>
      </div>
      <input ref="fileInput" type="file" class="hidden-input" :accept="ACCEPT" @change="onFileChange" />
    </div>
    <div v-else-if="isPreset" class="promo-toolbar">
      <div class="promo-hint">
        <span class="promo-title">全院宣传资料</span>
        <span class="promo-desc">共 {{ rows.length }} 个文件，可按实训室筛选后预览、下载或删除</span>
      </div>
    </div>
    <div v-else class="promo-toolbar">
      <div class="promo-hint">
        <span class="promo-title">宣传资料</span>
        <span class="promo-desc">由学院实训室资料管理统一维护，可预览与下载</span>
      </div>
    </div>

    <el-table v-loading="loading" :data="rows" stripe empty-text="暂未上传宣传资料">
      <el-table-column label="文件名称" min-width="240">
        <template #default="{ row }">
          <div class="file-name">
            <span class="file-badge" :class="`type-${row.type.toLowerCase()}`">{{ row.type }}</span>
            <span class="file-text" :title="row.fileName">{{ row.fileName }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column v-if="showLab" label="所属实训室" min-width="140">
        <template #default="{ row }">{{ row.laboratoryName || '—' }}</template>
      </el-table-column>
      <el-table-column label="大小" width="100" align="right">
        <template #default="{ row }">{{ formatSize(row.size) }}</template>
      </el-table-column>
      <el-table-column label="上传者" width="120">
        <template #default="{ row }">{{ row.uploaderName || '—' }}</template>
      </el-table-column>
      <el-table-column label="上传时间" width="164">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" :width="editable ? 190 : 130" align="right">
        <template #default="{ row }">
          <el-button link type="primary" :disabled="!row.previewable" @click="openPreview(row)">预览</el-button>
          <el-button link type="primary" @click="download(row)">下载</el-button>
          <el-button v-if="editable" link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="preview.visible" :title="preview.name" width="76%" top="6vh" destroy-on-close @closed="revoke">
      <div v-loading="preview.loading" class="preview-body">
        <img v-if="preview.type === 'IMAGE' && preview.url" :src="preview.url" alt="宣传图片预览" class="preview-image" />
        <video v-else-if="preview.type === 'VIDEO' && preview.url" :src="preview.url" controls class="preview-video" />
        <iframe v-else-if="preview.type === 'PDF' && preview.url" :src="preview.url" class="preview-frame" title="PDF 预览" />
        <el-empty v-else-if="!preview.loading" description="该格式不支持在线预览，请下载后查看" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  downloadLabFile, labProfileApi, previewLabFile,
  type LabPromotionFile
} from '@/api/labProfiles'

const props = withDefaults(defineProps<{
  labId: number
  editable?: boolean
  /** 学院端全量列表模式：显示所属实训室列 */
  showLab?: boolean
  /** 外部传入列表（全量列表模式），不传则自行按实训室拉取 */
  preset?: LabPromotionFile[] | null
}>(), { editable: false, showLab: false, preset: null })

const emit = defineEmits<{ changed: [] }>()

const isPreset = computed(() => props.preset != null)

const MAX_MB = 200
const ACCEPT = '.ppt,.pptx,.pdf,.doc,.docx,.mp4,.webm,.mov,.png,.jpg,.jpeg,.webp,.gif'

const rows = ref<LabPromotionFile[]>([])
const loading = ref(false)
const uploading = ref(false)
const progress = ref(0)
const fileInput = ref<HTMLInputElement>()

const preview = reactive({
  visible: false, loading: false, url: '', type: '' as string, name: ''
})

function formatSize(size: number): string {
  if (!size) return '0 B'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function formatTime(value: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

async function load() {
  if (props.preset) { rows.value = props.preset; return }
  if (!props.labId) { rows.value = []; return }
  loading.value = true
  try {
    rows.value = await labProfileApi.files(props.labId)
  } catch { /* 请求层已提示 */ }
  finally { loading.value = false }
}

function pickFile() {
  if (uploading.value) return
  fileInput.value?.click()
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (file.size > MAX_MB * 1024 * 1024) {
    ElMessage.warning(`文件不能超过 ${MAX_MB} MB`)
    return
  }
  uploading.value = true
  progress.value = 0
  try {
    await labProfileApi.upload(props.labId, file, (percent) => { progress.value = percent })
    ElMessage.success('宣传资料已上传')
    await load()
    emit('changed')
  } catch { /* 请求层已提示失败原因 */ }
  finally { uploading.value = false; progress.value = 0 }
}

async function download(row: LabPromotionFile) {
  try {
    await downloadLabFile(row)
  } catch {
    ElMessage.error('下载失败，请稍后重试')
  }
}

async function openPreview(row: LabPromotionFile) {
  if (!row.previewable) return
  preview.visible = true
  preview.loading = true
  preview.name = row.fileName
  preview.type = row.type
  revoke()
  try {
    preview.url = await previewLabFile(row)
  } catch {
    ElMessage.error('预览加载失败，请改为下载查看')
  } finally {
    preview.loading = false
  }
}

function revoke() {
  if (preview.url) {
    URL.revokeObjectURL(preview.url)
    preview.url = ''
  }
}

async function remove(row: LabPromotionFile) {
  try {
    await ElMessageBox.confirm(
      `确认删除「${row.fileName}」？删除后文件将从存储中移除，无法恢复。`,
      '删除宣传资料',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消', confirmButtonClass: 'el-button--danger' }
    )
  } catch { return }
  try {
    await labProfileApi.removeFile(row.id)
    ElMessage.success('文件已删除')
    await load()
    emit('changed')
  } catch { /* 请求层已提示失败原因 */ }
}

watch(() => [props.labId, props.preset], () => { void load() })
onMounted(load)
</script>

<style scoped>
.promo-files { display: grid; gap: 12px; }
.promo-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.promo-hint { display: flex; flex-direction: column; gap: 2px; }
.promo-title { font-weight: 600; color: var(--lm-text); }
.promo-desc { font-size: 12px; color: var(--lm-text-secondary); }
.promo-actions { display: flex; align-items: center; gap: 14px; }
.promo-progress { width: 140px; }
.hidden-input { display: none; }
.file-name { display: flex; align-items: center; gap: 10px; min-width: 0; }
.file-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-badge {
  flex: none; padding: 1px 8px; border-radius: 6px; font-size: 11px; font-weight: 600;
  letter-spacing: .04em; background: var(--lm-primary-soft, #fdf0e7); color: var(--lm-primary);
}
.file-badge.type-video, .file-badge.type-image { background: #eef6ff; color: #2563eb; }
.file-badge.type-pdf { background: #fdeceb; color: #d64545; }
.preview-body { min-height: 220px; display: flex; align-items: center; justify-content: center; }
.preview-image { max-width: 100%; max-height: 68vh; border-radius: 10px; }
.preview-video { width: 100%; max-height: 68vh; border-radius: 10px; background: #000; }
.preview-frame { width: 100%; height: 68vh; border: 1px solid var(--lm-border); border-radius: 10px; }
</style>
