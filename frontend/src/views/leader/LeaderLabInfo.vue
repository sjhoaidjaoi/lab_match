<template>
  <section v-loading="loading" class="page">
    <header class="page-header lab-header">
      <div>
        <h1 class="page-title">实训室相关信息</h1>
        <p class="page-desc">查看本室现有资料，在下方修改信息。</p>
      </div>
    </header>

    <el-empty v-if="!labId" description="当前账号未绑定实训室，请联系学院管理员" />
    <el-alert v-else-if="failed" title="实训室信息加载失败" type="error" :closable="false">
      <el-button text @click="load">重试</el-button>
    </el-alert>
    <template v-else-if="lab">
      <el-alert v-if="!canEdit" title="当前账号未获本实训室的资料管理权限，请联系学院管理员"
        type="warning" :closable="false" show-icon />
      <el-card shadow="never" class="lab-overview">
        <template #header>当前实训室信息</template>
        <dl class="lab-summary">
          <div><dt>名称</dt><dd>{{ lab.name }}</dd></div>
          <div><dt>负责人</dt><dd>{{ lab.leaderName || '待学院指定' }}</dd></div>
          <div><dt>项目方向</dt><dd>{{ lab.projectDirection || '—' }}</dd></div>
          <div><dt>技术栈</dt><dd>{{ lab.technologyStack || '—' }}</dd></div>
          <div><dt>计划招生</dt><dd>{{ lab.recruitmentQuota }} 人</dd></div>
          <div><dt>状态</dt><dd>{{ lab.status === 'ACTIVE' ? '启用' : '已停用' }}</dd></div>
          <div><dt>本室教师</dt><dd>{{ staffNames.join('、') || '暂无教师账号' }}</dd></div>
          <div><dt>已展示的导师</dt><dd>{{ lab.teachers?.map(item => item.name).join('、') || '暂无已展示的导师' }}</dd></div>
          <div><dt>宣讲与开放日</dt><dd>宣讲视频 {{ lab.briefingVideoUrl || lab.videos?.length ? '已配置' : '未配置' }} · 云游 {{ lab.tourVideoUrl || lab.panoramicResource || lab.panoramas?.length ? '已配置' : '未配置' }}</dd></div>
          <div class="wide"><dt>实训室简介</dt><dd>{{ lab.description || '—' }}</dd></div>
          <div v-if="lab.briefingText" class="wide"><dt>宣讲介绍</dt><dd>{{ lab.briefingText }}</dd></div>
        </dl>
      </el-card>
      <h2 class="edit-title">修改信息</h2>
      <el-tabs v-if="canEdit" v-model="tab">
        <el-tab-pane label="基本信息与招生名额" name="profile">
        <el-card shadow="never">
          <template #header>基本资料</template>
          <el-form :model="form" label-position="top" :disabled="saving || !canEdit" @submit.prevent="save">
            <el-form-item label="实训室名称" required>
              <el-input v-model="form.name" maxlength="128" required />
            </el-form-item>
            <div class="lab-fields">
              <el-form-item label="项目方向">
                <el-input v-model="form.projectDirection" maxlength="255" />
              </el-form-item>
              <el-form-item label="技术栈">
                <el-input v-model="form.technologyStack" maxlength="255" />
              </el-form-item>
            </div>
            <div class="lab-fields">
              <el-form-item label="计划招生名额">
                <el-input-number v-model="form.recruitmentQuota" :min="0" :max="4294967295" :step="1" step-strict />
              </el-form-item>
              <el-form-item label="实训室状态">
                <el-radio-group v-model="form.status">
                  <el-radio value="ACTIVE">启用</el-radio>
                  <el-radio value="INACTIVE">停用</el-radio>
                </el-radio-group>
              </el-form-item>
            </div>
            <el-form-item label="实训室简介">
              <el-input v-model="form.description" type="textarea" :rows="6" maxlength="5000" show-word-limit />
            </el-form-item>
            <el-button type="primary" native-type="submit" :loading="saving" :disabled="!dirty">保存资料</el-button>
            <el-button :disabled="!dirty" @click="resetForm">撤销未保存修改</el-button>
          </el-form>
        </el-card>
        </el-tab-pane>
        <el-tab-pane label="教师与导师" name="staff" lazy>
          <LeaderLabTeachers :lab-id="lab.id" :quota="lab.recruitmentQuota" @updated="refreshOverview" />
        </el-tab-pane>
        <el-tab-pane label="宣讲与开放日" name="media" lazy>
          <LeaderLabContent :lab="lab" @updated="refreshOverview" />
        </el-tab-pane>
      </el-tabs>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute } from 'vue-router'
import { labApi, type LabProfile } from '@/api/lab'
import { studentApi, type LabDetail } from '@/api/student'
import { useAuthStore } from '@/stores/auth'
import LeaderLabContent from './LeaderLabContent.vue'
import LeaderLabTeachers from './LeaderLabTeachers.vue'

const auth = useAuthStore()
const route = useRoute()
const labId = computed(() => auth.user?.laboratoryId ?? null)
const lab = ref<LabDetail>()
const loading = ref(false)
const failed = ref(false)
const saving = ref(false)
const form = reactive<LabProfile>({ name: '', projectDirection: '', technologyStack: '', description: '', recruitmentQuota: 0, status: 'ACTIVE' })
const tab = ref('profile')
const staffNames = ref<string[]>([])
const fields = ['name', 'projectDirection', 'technologyStack', 'description'] as const
const canEdit = computed(() => !!lab.value && (lab.value.leaderId == null || lab.value.leaderId === auth.user?.id))
const changes = computed(() => {
  const patch: Partial<LabProfile> = {}
  if (!lab.value) return patch
  for (const field of fields) {
    const value = form[field].trim()
    if (value !== (lab.value[field] ?? '')) patch[field] = value
  }
  if (form.recruitmentQuota !== lab.value.recruitmentQuota) patch.recruitmentQuota = form.recruitmentQuota
  if (form.status !== lab.value.status) patch.status = form.status
  return patch
})
const dirty = computed(() => Object.keys(changes.value).length > 0)

function resetForm() {
  for (const field of fields) form[field] = lab.value?.[field] ?? ''
  form.recruitmentQuota = lab.value?.recruitmentQuota ?? 0
  form.status = lab.value?.status ?? 'ACTIVE'
}

async function readOverview() {
  const id = labId.value
  if (!id) return
  const detail = await studentApi.labDetail(id)
  const members = detail.leaderId == null || detail.leaderId === auth.user?.id ? await labApi.staff(id) : []
  if (id !== labId.value) return
  lab.value = detail
  staffNames.value = members.filter(item => item.status === 'ACTIVE').map(item => item.realName)
}

function refreshOverview() {
  void readOverview().catch(() => undefined)
}

async function load() {
  const id = labId.value
  lab.value = undefined
  failed.value = false
  if (!id) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    await readOverview()
    if (id !== labId.value) return
    resetForm()
  } catch {
    if (id === labId.value) failed.value = true
  } finally {
    if (id === labId.value) loading.value = false
  }
}

async function save() {
  const id = labId.value
  if (!id || lab.value?.id !== id || !canEdit.value || saving.value || !dirty.value) return
  if (!form.name.trim()) {
    ElMessage.warning('请填写实训室名称')
    return
  }
  if (!Number.isSafeInteger(form.recruitmentQuota) || form.recruitmentQuota < 0) {
    ElMessage.warning('请填写非负整数招生名额')
    return
  }

  saving.value = true
  try {
    const saved = await labApi.updateProfile(id, changes.value)
    if (lab.value?.id !== id) return
    lab.value = { ...lab.value, ...saved }
    resetForm()
    ElMessage.success('实训室资料已保存')
  } catch {
    // 请求层展示服务端错误并保留当前编辑内容。
  } finally {
    saving.value = false
  }
}

watch(labId, load, { immediate: true })
watch(() => route.query.tab, value => {
  tab.value = value === 'media' || value === 'staff' ? value : 'profile'
}, { immediate: true })
</script>

<style scoped>
.lab-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.el-alert + .lab-overview { margin-top: 14px; }
.lab-summary { margin: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px 20px; }
.lab-summary dt { color: var(--workspace-muted); font-size: 13px; }
.lab-summary dd { margin: 4px 0 0; overflow-wrap: anywhere; white-space: pre-wrap; }
.lab-summary .wide { grid-column: 1 / -1; }
.edit-title { margin: 22px 0 10px; font-size: 19px; }
.lab-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
@media (max-width: 760px) {
  .lab-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .lab-fields { grid-template-columns: minmax(0, 1fr); }
}
</style>
