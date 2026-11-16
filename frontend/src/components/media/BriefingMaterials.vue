<template>
  <section class="briefing-materials">
    <h2>宣讲文档</h2>
    <p v-if="loading">正在读取资料…</p>
    <el-alert v-else-if="failed" title="资料加载失败" type="error" :closable="false"><el-button text @click="load">重试</el-button></el-alert>
    <p v-else-if="!materials.length">暂无 PDF 或演示文稿</p>
    <ul v-else>
      <li v-for="item in materials" :key="item.id">
        <el-button link type="primary" :loading="busy === item.id" @click="download(item)">{{ item.name }} · 下载</el-button>
        <el-button v-if="removable" link type="danger" :disabled="Boolean(busy)" @click="remove(item)">移除</el-button>
      </li>
    </ul>
    <label v-if="editable">
      上传 PDF、PPT 或 PPTX（20 MB 以内）
      <input type="file" accept=".pdf,.ppt,.pptx" :disabled="Boolean(busy)" @change="upload" />
    </label>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import service, { http } from '@/api/request'

interface Material { id: string; name: string; mime: string }
const props = defineProps<{ labId: number; editable?: boolean; removable?: boolean }>()
const materials = ref<Material[]>([])
const loading = ref(false)
const failed = ref(false)
const busy = ref('')
const endpoint = (labId: number) => `/media/labs/${labId}/materials`

async function load() {
  const id = props.labId
  loading.value = true
  failed.value = false
  try {
    const items = await http.get<Material[]>(endpoint(id))
    if (id === props.labId) materials.value = items
  } catch {
    if (id === props.labId) failed.value = true
  } finally {
    if (id === props.labId) loading.value = false
  }
}

async function upload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || busy.value) return
  const data = new FormData()
  data.append('file', file)
  busy.value = 'upload'
  try {
    await http.post<Material>(endpoint(props.labId), data)
    ElMessage.success('宣讲资料已发布')
    await load()
  } catch {
    // 请求拦截器展示失败原因。
  } finally {
    busy.value = ''
  }
}

async function download(item: Material) {
  if (busy.value) return
  busy.value = item.id
  try {
    const response = await service.get<Blob>(`${endpoint(props.labId)}/${item.id}`, { responseType: 'blob' })
    const url = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = url
    link.download = item.name
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch {
    // 请求拦截器展示失败原因。
  } finally {
    busy.value = ''
  }
}

async function remove(item: Material) {
  if (busy.value) return
  const accepted = await ElMessageBox.confirm(`移除宣讲文档「${item.name}」？`, '移除宣讲文档', { type: 'warning' })
    .then(() => true, () => false)
  if (!accepted || busy.value) return
  busy.value = item.id
  try {
    await http.delete(`${endpoint(props.labId)}/${item.id}`)
    await load()
  } catch { /* 请求层显示错误。 */ }
  finally { busy.value = '' }
}

watch(() => props.labId, load, { immediate: true })
</script>

<style scoped>
.briefing-materials { margin-top: 20px; }
.briefing-materials h2 { font-size: 16px; }
.briefing-materials ul { padding-left: 18px; }
.briefing-materials label, .briefing-materials input { display: block; margin-top: 8px; }
</style>
