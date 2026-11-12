<template>
  <div class="page">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h2 class="page-title">实训室开放日管理</h2>
          <p class="page-desc">维护第二阶段开放日的场次安排（日期/时间/地点）与 720° 全景云游资源，学生端「实训室开放日」页面按实训室展示。</p>
        </div>
        <div class="actions">
          <el-button v-if="tab === 'schedule'" type="primary" @click="openSchedule()">新增开放日场次</el-button>
          <el-button v-else type="primary" @click="open()">新增全景资源</el-button>
        </div>
      </div>
    </div>

    <el-card shadow="never">
      <el-tabs v-model="tab">
        <el-tab-pane label="开放日安排" name="schedule">
          <el-table v-loading="loading" :data="schedules" stripe>
            <el-table-column prop="date" label="日期" width="120" />
            <el-table-column label="时间" width="130">
              <template #default="{ row }">{{ row.startTime }} - {{ row.endTime }}</template>
            </el-table-column>
            <el-table-column label="所属实训室" min-width="160">
              <template #default="{ row }">{{ row.laboratoryName || labName(row.laboratoryId) }}</template>
            </el-table-column>
            <el-table-column prop="title" label="场次主题" min-width="200" />
            <el-table-column prop="location" label="地点" min-width="160" show-overflow-tooltip />
            <el-table-column prop="note" label="备注" min-width="160" show-overflow-tooltip />
            <el-table-column label="操作" width="150" align="center">
              <template #default="{ row }">
                <el-button size="small" text type="primary" @click="openSchedule(row)">编辑</el-button>
                <el-button size="small" text type="danger" @click="removeSchedule(row)">删除</el-button>
              </template>
            </el-table-column>
            <template #empty><span class="muted">暂无开放日场次，点击右上角新增</span></template>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="720° 全景资源" name="panorama">
          <el-table v-loading="loading" :data="panoramas" stripe>
            <el-table-column prop="name" label="全景名称" min-width="220" />
            <el-table-column label="所属实训室" min-width="180">
              <template #default="{ row }">{{ labName(row.laboratoryId) }}</template>
            </el-table-column>
            <el-table-column prop="panoramaType" label="类型" width="90" align="center" />
            <el-table-column prop="panoramaUrl" label="资源地址" min-width="260" show-overflow-tooltip />
            <el-table-column label="状态" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status === 'PUBLISHED' ? 'success' : 'info'" effect="light">
                  {{ row.status === 'PUBLISHED' ? '已发布' : '草稿' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150" align="center">
              <template #default="{ row }">
                <el-button size="small" text type="primary" @click="open(row)">编辑</el-button>
                <el-button size="small" text type="danger" @click="remove(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-alert
      class="tip"
      type="info"
      :closable="false"
      title="全景类型说明"
      description="LINK：720 云 / Krpano 等全景作品页，用 iframe 加载；IMAGE：等距柱状全景图直链。"
    />

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑全景资源' : '新增全景资源'" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="所属实训室" prop="laboratoryId">
          <el-select v-model="form.laboratoryId" style="width: 100%">
            <el-option v-for="l in labs" :key="l.id" :label="l.name" :value="l.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="全景名称" prop="name"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="资源类型" prop="panoramaType">
          <el-radio-group v-model="form.panoramaType">
            <el-radio value="LINK">外链作品页</el-radio>
            <el-radio value="IMAGE">全景图片</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="资源地址" prop="panoramaUrl"><el-input v-model="form.panoramaUrl" placeholder="https://..." /></el-form-item>
        <el-form-item label="封面图"><el-input v-model="form.coverUrl" placeholder="选填" /></el-form-item>
        <el-form-item label="简介">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="PUBLISHED">发布</el-radio>
            <el-radio value="DRAFT">草稿</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="scheduleVisible" :title="scheduleEditing ? '编辑开放日场次' : '新增开放日场次'" width="560px">
      <el-form ref="scheduleFormRef" :model="scheduleForm" :rules="scheduleRules" label-width="100px">
        <el-form-item label="所属实训室" prop="laboratoryId">
          <el-select v-model="scheduleForm.laboratoryId" style="width: 100%">
            <el-option v-for="l in labs" :key="l.id" :label="l.name" :value="l.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="场次主题" prop="title"><el-input v-model="scheduleForm.title" placeholder="如：智能软件工程实验室开放日" /></el-form-item>
        <el-form-item label="日期" prop="date">
          <el-date-picker v-model="scheduleForm.date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="开始时间" prop="startTime">
          <el-time-picker v-model="scheduleForm.startTime" value-format="HH:mm" format="HH:mm" style="width: 100%" />
        </el-form-item>
        <el-form-item label="结束时间" prop="endTime">
          <el-time-picker v-model="scheduleForm.endTime" value-format="HH:mm" format="HH:mm" style="width: 100%" />
        </el-form-item>
        <el-form-item label="地点"><el-input v-model="scheduleForm.location" placeholder="如：实验楼 A301" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="scheduleForm.note" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="scheduleVisible = false">取消</el-button>
        <el-button type="primary" @click="saveSchedule">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { collegeApi } from '@/api/college'
import { mediaApi } from '@/api/media'
import type { LabView, OpenDaySchedule, PanoramaItem } from '@/types'

const panoramas = ref<PanoramaItem[]>([])
const labs = ref<LabView[]>([])
const loading = ref(false)
const tab = ref('schedule')

// 开放日场次
const schedules = ref<OpenDaySchedule[]>([])
const scheduleVisible = ref(false)
const scheduleEditing = ref<OpenDaySchedule | null>(null)
const scheduleFormRef = ref<FormInstance>()
const scheduleForm = reactive({
  laboratoryId: 0, title: '', date: '', startTime: '09:00', endTime: '11:30', location: '', note: ''
})
const scheduleRules: FormRules = {
  laboratoryId: [{ required: true, message: '请选择实训室', trigger: 'change' }],
  title: [{ required: true, message: '请输入场次主题', trigger: 'blur' }],
  date: [{ required: true, message: '请选择日期', trigger: 'change' }],
  startTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  endTime: [{ required: true, message: '请选择结束时间', trigger: 'change' }]
}
const dialogVisible = ref(false)
const editing = ref<PanoramaItem | null>(null)
const formRef = ref<FormInstance>()
const form = reactive({
  laboratoryId: 0, name: '', panoramaType: 'LINK', panoramaUrl: '',
  coverUrl: '', description: '', status: 'PUBLISHED'
})
const rules: FormRules = {
  laboratoryId: [{ required: true, message: '请选择实训室', trigger: 'change' }],
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  panoramaUrl: [{ required: true, message: '请输入资源地址', trigger: 'blur' }]
}

function labName(id: number) {
  return labs.value.find((l) => l.id === id)?.name || `实训室#${id}`
}

async function load() {
  loading.value = true
  try {
    const [p, l, s] = await Promise.all([mediaApi.adminPanoramas(), collegeApi.labs(), collegeApi.openDays()])
    panoramas.value = p
    labs.value = l
    schedules.value = s
  } finally {
    loading.value = false
  }
}

function openSchedule(row?: OpenDaySchedule) {
  scheduleEditing.value = row || null
  Object.assign(scheduleForm, {
    laboratoryId: row?.laboratoryId || labs.value[0]?.id || 0,
    title: row?.title || '',
    date: row?.date || '',
    startTime: row?.startTime || '09:00',
    endTime: row?.endTime || '11:30',
    location: row?.location || '',
    note: row?.note || ''
  })
  scheduleVisible.value = true
}

async function saveSchedule() {
  if (!scheduleFormRef.value) return
  await scheduleFormRef.value.validate(async (valid) => {
    if (!valid) return
    if (scheduleEditing.value) {
      await collegeApi.updateOpenDay(scheduleEditing.value.id, { ...scheduleForm })
      ElMessage.success('场次已更新')
    } else {
      await collegeApi.createOpenDay({ ...scheduleForm })
      ElMessage.success('场次已新增')
    }
    scheduleVisible.value = false
    await load()
  })
}

async function removeSchedule(row: OpenDaySchedule) {
  await ElMessageBox.confirm(`确认删除「${row.title}」？`, '删除开放日场次', { type: 'warning' })
  await collegeApi.deleteOpenDay(row.id)
  ElMessage.success('已删除')
  await load()
}

function open(row?: PanoramaItem) {
  editing.value = row || null
  Object.assign(form, {
    laboratoryId: row?.laboratoryId || labs.value[0]?.id || 0,
    name: row?.name || '', panoramaType: row?.panoramaType || 'LINK',
    panoramaUrl: row?.panoramaUrl || '', coverUrl: row?.coverUrl || '',
    description: row?.description || '', status: row?.status || 'PUBLISHED'
  })
  dialogVisible.value = true
}

async function save() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    if (editing.value) {
      await mediaApi.updatePanorama(editing.value.id, { ...form })
      ElMessage.success('全景资源已更新')
    } else {
      await mediaApi.createPanorama({ ...form })
      ElMessage.success('全景资源已新增')
    }
    dialogVisible.value = false
    await load()
  })
}

async function remove(row: PanoramaItem) {
  await ElMessageBox.confirm(`确认删除「${row.name}」？`, '删除全景资源', { type: 'warning' })
  await mediaApi.deletePanorama(row.id)
  ElMessage.success('已删除')
  await load()
}

onMounted(load)
</script>

<style scoped>
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.actions { display: flex; gap: 10px; }
.tip { margin-top: 16px; }
.muted { color: var(--lm-text-secondary); font-size: 12.5px; }
</style>
