<template>
  <el-form :model="form" label-position="top" :disabled="busy" @submit.prevent="save">
    <el-card shadow="never">
      <template #header>集中宣讲</template>
      <el-form-item label="宣讲介绍"><el-input v-model="form.briefingText" type="textarea" :rows="5" maxlength="5000" /></el-form-item>
      <el-form-item label="介绍视频"><el-input v-model="form.briefingVideoUrl" placeholder="https://… 或上传 MP4" /></el-form-item>
      <el-form-item label="播放方式">
        <el-select v-model="form.briefingVideoType"><el-option v-for="(label, type) in videoTypes" :key="type" :label="label" :value="type" /></el-select>
      </el-form-item>
      <input type="file" accept=".mp4,video/mp4" aria-label="上传介绍视频" :disabled="busy" @change="upload($event, 'briefing')" />
      <BriefingMaterials :lab-id="lab.id" editable removable />
    </el-card>
    <el-card shadow="never" class="content-card">
      <template #header>实训室开放日</template>
      <el-form-item label="空间全景链接"><el-input v-model="form.panoramicResource" placeholder="https://…" /></el-form-item>
      <el-form-item label="云游视频"><el-input v-model="form.tourVideoUrl" placeholder="https://… 或上传 MP4" /></el-form-item>
      <el-form-item label="播放方式">
        <el-select v-model="form.tourVideoType"><el-option v-for="(label, type) in videoTypes" :key="type" :label="label" :value="type" /></el-select>
      </el-form-item>
      <input type="file" accept=".mp4,video/mp4" aria-label="上传云游视频" :disabled="busy" @change="upload($event, 'tour')" />
    </el-card>
    <el-button class="content-card" type="primary" native-type="submit" :loading="busy">保存宣讲与开放日资料</el-button>
  </el-form>
  <AdminVideos class="content-card" :lab-id="lab.id" @updated="emit('updated')" />
  <AdminPanoramas class="content-card" :lab-id="lab.id" @updated="emit('updated')" />
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import BriefingMaterials from '@/components/media/BriefingMaterials.vue'
import { http } from '@/api/request'
import type { LabDetail } from '@/api/student'
import AdminVideos from '@/views/admin/AdminVideos.vue'
import AdminPanoramas from '@/views/admin/AdminPanoramas.vue'

const props = defineProps<{ lab: LabDetail }>()
const emit = defineEmits<{ updated: [] }>()
const busy = ref(false)
const videoTypes = { LINK: '外链页面', MP4: 'MP4', EMBED: '内嵌视频' }
type VideoType = keyof typeof videoTypes
const form = reactive({
  briefingText: '', briefingVideoUrl: '', briefingVideoType: 'LINK' as VideoType,
  tourVideoUrl: '', tourVideoType: 'LINK' as VideoType, panoramicResource: ''
})
watch(() => props.lab.id, () => {
  const lab = props.lab
  Object.assign(form, {
    briefingText: lab.briefingText || '', briefingVideoUrl: lab.briefingVideoUrl || '',
    briefingVideoType: lab.briefingVideoType || 'LINK', tourVideoUrl: lab.tourVideoUrl || '',
    tourVideoType: lab.tourVideoType || 'LINK', panoramicResource: lab.panoramicResource || ''
  })
}, { immediate: true })

async function upload(event: Event, target: 'briefing' | 'tour') {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || busy.value) return
  if (!/\.mp4$/i.test(file.name) || file.size > 100 * 1024 * 1024) {
    ElMessage.warning('请选择 100 MB 以内的 MP4 视频')
    return
  }
  const data = new FormData()
  data.append('file', file)
  busy.value = true
  try {
    const result = await http.post<{ url: string }>('/media/upload', data)
    if (target === 'briefing') {
      form.briefingVideoUrl = result.url
      form.briefingVideoType = 'MP4'
    } else {
      form.tourVideoUrl = result.url
      form.tourVideoType = 'MP4'
    }
    ElMessage.success('视频已上传，保存后学生可见')
  } catch { /* 请求层显示错误。 */ }
  finally { busy.value = false }
}

async function save() {
  if (busy.value) return
  const briefing = form.briefingVideoUrl.trim()
  const tour = form.tourVideoUrl.trim()
  const panorama = form.panoramicResource.trim()
  const validVideo = (value: string) => !value || /^https?:\/\//i.test(value) || /^\/uploads\/[\w.-]+$/.test(value)
  if (!validVideo(briefing) || !validVideo(tour) || (panorama && !/^https?:\/\//i.test(panorama))) {
    ElMessage.warning('请使用有效的 HTTP(S) 链接，或上传 MP4 视频')
    return
  }
  busy.value = true
  try {
    await http.put(`/laboratories/${props.lab.id}`, {
      briefingText: form.briefingText.trim(),
      panoramicResource: panorama || null,
      briefingVideoUrl: briefing || null, briefingVideoType: form.briefingVideoType,
      tourVideoUrl: tour || null, tourVideoType: form.tourVideoType
    })
    ElMessage.success('资料已发布')
    emit('updated')
  } catch { /* 请求层显示错误。 */ }
  finally { busy.value = false }
}
</script>

<style scoped>
.content-card { margin-top: 16px; }
</style>
