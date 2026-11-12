<template>
  <div class="page">
    <div class="page-header">
      <h2 class="page-title">公示管理</h2>
      <p class="page-desc">公示最终录取名单并设置公示起止时间，学生端在公示期内可查看结果。</p>
    </div>

    <el-card v-if="publication" shadow="never" class="block">
      <template #header>
        <div class="block-header">
          <span>当前公示</span>
          <el-tag :type="statusTag(publication.status)" effect="light">
            {{ publication.status === 'PUBLISHED' ? '公示中' : publication.status }}
          </el-tag>
        </div>
      </template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="标题">{{ publication.title }}</el-descriptions-item>
        <el-descriptions-item label="发布时间">{{ formatTime(publication.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="公示开始">{{ formatTime(publication.startAt) }}</el-descriptions-item>
        <el-descriptions-item label="公示结束">{{ formatTime(publication.endAt) }}</el-descriptions-item>
        <el-descriptions-item label="公示说明" :span="2">{{ publication.content || '—' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card shadow="never" class="block">
      <template #header>
        <div class="block-header">
          <span>{{ publication ? '重新发布公示' : '发布公示' }}</span>
          <span class="muted">当前最终名单 {{ finalCount }} 人</span>
        </div>
      </template>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" class="form">
        <el-form-item label="公示标题" prop="title">
          <el-input v-model="form.title" />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="开始时间" prop="startAt">
              <el-date-picker v-model="form.startAt" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束时间" prop="endAt">
              <el-date-picker v-model="form.endAt" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="公示说明">
          <el-input v-model="form.content" type="textarea" :rows="4" placeholder="异议渠道、受理方式等" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="submit">发布公示</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    <el-card shadow="never" class="block">
      <template #header>
        <div class="block-header">
          <span>公示期间异议处理</span>
          <el-button size="small" type="primary" @click="openObjection">登记异议</el-button>
        </div>
      </template>
      <el-table :data="objections" stripe size="small">
        <el-table-column prop="studentNumber" label="学号" width="120" />
        <el-table-column prop="studentName" label="姓名" width="100" />
        <el-table-column prop="type" label="异议类型" width="130" />
        <el-table-column prop="content" label="异议内容" min-width="220" show-overflow-tooltip />
        <el-table-column label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="OBJECTION_TAG[row.status]" effect="light">{{ OBJECTION_LABELS[row.status] || row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="handlingNote" label="处理意见" min-width="180" show-overflow-tooltip />
        <el-table-column label="处理人" width="100">
          <template #default="{ row }">{{ row.handlerName || '—' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center">
          <template #default="{ row }">
            <template v-if="row.status === 'PENDING'">
              <el-button size="small" text type="success" @click="handle(row, 'ACCEPTED')">受理</el-button>
              <el-button size="small" text type="danger" @click="handle(row, 'REJECTED')">驳回</el-button>
            </template>
            <span v-else class="muted">已处理</span>
          </template>
        </el-table-column>
        <template #empty><span class="muted">暂无异议记录</span></template>
      </el-table>
    </el-card>

    <el-dialog v-model="objectionVisible" title="登记公示异议" width="520px">
      <el-form ref="objectionFormRef" :model="objectionForm" :rules="objectionRules" label-width="90px">
        <el-form-item label="学生" prop="studentId">
          <el-select v-model="objectionForm.studentId" filterable style="width: 100%">
            <el-option
              v-for="s in students" :key="s.id"
              :label="`${s.studentNumber || s.username} ${s.realName}`" :value="s.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="异议类型" prop="type">
          <el-select v-model="objectionForm.type" style="width: 100%">
            <el-option v-for="t in OBJECTION_TYPES" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="异议内容" prop="content">
          <el-input v-model="objectionForm.content" type="textarea" :rows="4" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="objectionVisible = false">取消</el-button>
        <el-button type="primary" @click="submitObjection">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { collegeApi } from '@/api/college'
import type { ObjectionItem, PublicationInfo, UserAccount } from '@/types'
import { formatTime, statusTag } from './shared'

const publication = ref<PublicationInfo | null>(null)
const finalCount = ref(0)
const submitting = ref(false)

// 公示异议
const objections = ref<ObjectionItem[]>([])
const students = ref<UserAccount[]>([])
const objectionVisible = ref(false)
const objectionFormRef = ref<FormInstance>()
const objectionForm = reactive({ studentId: undefined as number | undefined, type: '', content: '' })
const OBJECTION_TYPES = ['成绩异议', '名额异议', '信息错误', '其他']
const OBJECTION_LABELS: Record<string, string> = { PENDING: '待处理', ACCEPTED: '已受理', REJECTED: '已驳回' }
const OBJECTION_TAG: Record<string, 'warning' | 'success' | 'danger'> = { PENDING: 'warning', ACCEPTED: 'success', REJECTED: 'danger' }
const objectionRules: FormRules = {
  studentId: [{ required: true, message: '请选择学生', trigger: 'change' }],
  type: [{ required: true, message: '请选择异议类型', trigger: 'change' }],
  content: [{ required: true, message: '请输入异议内容', trigger: 'blur' }]
}
const formRef = ref<FormInstance>()
const form = reactive({ title: '2026 届实训室选拔最终录取名单公示', startAt: '', endAt: '', content: '' })
const rules: FormRules = {
  title: [{ required: true, message: '请输入公示标题', trigger: 'blur' }],
  startAt: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  endAt: [{ required: true, message: '请选择结束时间', trigger: 'change' }]
}

async function load() {
  const [p, finals, objs] = await Promise.all([
    collegeApi.publication(), collegeApi.finalList(), collegeApi.objections()
  ])
  publication.value = p
  finalCount.value = (finals.perLab || []).reduce((s, l) => s + l.students.length, 0)
  objections.value = objs
}

function openObjection() {
  objectionForm.studentId = undefined
  objectionForm.type = OBJECTION_TYPES[0]
  objectionForm.content = ''
  objectionVisible.value = true
}

async function submitObjection() {
  if (!objectionFormRef.value) return
  await objectionFormRef.value.validate(async (valid) => {
    if (!valid) return
    await collegeApi.createObjection({
      studentId: objectionForm.studentId as number,
      type: objectionForm.type,
      content: objectionForm.content
    })
    ElMessage.success('异议已登记')
    objectionVisible.value = false
    await load()
  })
}

async function handle(row: ObjectionItem, status: 'ACCEPTED' | 'REJECTED') {
  const { value } = await ElMessageBox.prompt(
    `请填写处理意见（${status === 'ACCEPTED' ? '受理' : '驳回'}）`,
    '处理异议',
    { inputPlaceholder: '处理意见（选填）', inputValue: '' }
  )
  await collegeApi.handleObjection(row.id, status, value || '')
  ElMessage.success('已处理')
  await load()
}

async function submit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    await ElMessageBox.confirm('发布后学生端将可查看录取结果，是否继续？', '发布公示', { type: 'warning' })
    submitting.value = true
    try {
      await collegeApi.publish({
        title: form.title,
        content: form.content,
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString()
      })
      ElMessage.success('公示已发布')
      await load()
    } finally {
      submitting.value = false
    }
  })
}

onMounted(async () => {
  await load()
  students.value = await collegeApi.users({ role: 'STUDENT' })
})
</script>

<style scoped>
.block { margin-bottom: 14px; }
.block-header { display: flex; align-items: center; justify-content: space-between; }
.form { max-width: 720px; }
.muted { color: var(--lm-text-secondary); font-size: 12.5px; }
</style>
