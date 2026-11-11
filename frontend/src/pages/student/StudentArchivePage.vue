<template>
  <div v-loading="loading" class="archive-page">
    <div class="page-header">
      <div>
        <h2>我的档案</h2>
        <p class="subtitle">档案越完整，导师越能准确了解你；提交填报前必须补齐必填项</p>
      </div>
      <el-tag v-if="missingFields.length === 0" type="success">档案已完善</el-tag>
      <el-tag v-else type="warning">还有 {{ missingFields.length }} 项必填未完成</el-tag>
    </div>

    <el-alert
      v-if="missingFields.length > 0"
      type="warning"
      :closable="false"
      show-icon
      class="missing-alert"
      :title="`必填项未完成：${missingFields.map((key) => missingFieldLabels[key]).join('、')}`"
    />

    <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
      <el-card shadow="never" class="section">
        <template #header><span class="section-title">基本信息</span></template>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="学号">{{ archive?.userNo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="姓名">{{ archive?.realName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="学院">{{ archive?.college || '-' }}</el-descriptions-item>
          <el-descriptions-item label="专业">{{ archive?.major || '-' }}</el-descriptions-item>
          <el-descriptions-item label="年级">{{ archive?.grade || '-' }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-card shadow="never" class="section">
        <template #header><span class="section-title">学业</span></template>
        <div class="form-grid">
          <el-form-item label="班级">
            <el-input v-model="form.className" placeholder="如 软工2201" />
          </el-form-item>
          <el-form-item label="GPA" prop="gpa">
            <el-input-number v-model="form.gpa" :min="0" :max="5" :precision="2" :step="0.1" />
          </el-form-item>
          <el-form-item label="专业排名">
            <el-input-number v-model="form.ranking" :min="1" :max="999" />
          </el-form-item>
          <el-form-item label="英语等级">
            <el-input v-model="form.englishLevel" placeholder="如 CET-6" />
          </el-form-item>
        </div>
      </el-card>

      <el-card shadow="never" class="section">
        <template #header><span class="section-title">技能与经历</span></template>
        <div class="form-grid">
          <el-form-item label="编程语言">
            <el-select
              v-model="form.programmingLanguages"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="至少选择 1 项"
              class="full-width"
            >
              <el-option v-for="item in languageOptions" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>
          <el-form-item label="工具链">
            <el-select
              v-model="form.techStack"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="可选"
              class="full-width"
            >
              <el-option v-for="item in stackOptions" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="项目经历">
          <el-input v-model="form.projectExperience" type="textarea" :rows="3" placeholder="描述你参与过的项目与职责" />
        </el-form-item>
        <el-form-item label="竞赛经历">
          <el-input v-model="form.competitionExperience" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="科研经历">
          <el-input v-model="form.researchExperience" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="实习经历">
          <el-input v-model="form.internshipExperience" type="textarea" :rows="2" />
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section">
        <template #header><span class="section-title">时间投入</span></template>
        <div class="form-grid">
          <el-form-item label="每周可投入" prop="weeklyHours">
            <el-input-number v-model="form.weeklyHours" :min="1" :max="40" />
            <span class="unit">小时</span>
          </el-form-item>
          <el-form-item label="可投入时段">
            <el-input v-model="form.availableSlots" placeholder="如 工作日 19:00-22:00，周末全天" />
          </el-form-item>
          <el-form-item label="其他任职">
            <el-input v-model="form.otherDuties" placeholder="可选" />
          </el-form-item>
          <el-form-item label="期望方向">
            <el-input v-model="form.expectedDirection" placeholder="仅参考，不参与排序" />
          </el-form-item>
        </div>
      </el-card>

      <el-card shadow="never" class="section">
        <template #header><span class="section-title">个人陈述</span></template>
        <el-form-item prop="statement">
          <el-input
            v-model="form.statement"
            type="textarea"
            :rows="8"
            maxlength="800"
            show-word-limit
            placeholder="300-800 字，所有导师看到的是同一份陈述"
          />
        </el-form-item>
        <p class="statement-hint">所有导师看到的是同一份陈述，不能针对不同导师写不同版本。</p>
      </el-card>

      <div class="footer-actions">
        <el-button :loading="saving" @click="handleSave(false)">保存草稿</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave(true)">保存并去填报</el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { getMyArchive, saveMyArchive } from '@/api/studentArchive'
import type { StudentArchive, StudentArchiveSaveReq } from '@/types/student'

const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const archive = ref<StudentArchive | null>(null)
const missingFields = ref<string[]>([])
const formRef = ref<FormInstance>()

const languageOptions = ['Java', 'Python', 'C++', 'Go', 'JavaScript', 'SQL']
const stackOptions = ['Spring Boot', 'Vue 3', 'MySQL', 'Redis', 'Docker']

const missingFieldLabels: Record<string, string> = {
  programmingLanguages: '编程语言',
  projectExperience: '项目经历',
  weeklyHours: '每周可投入小时',
  availableSlots: '可投入时段',
  statement: '个人陈述'
}

function emptyForm(): StudentArchiveSaveReq {
  return {
    className: '',
    gpa: null,
    ranking: null,
    englishLevel: '',
    programmingLanguages: [],
    techStack: [],
    projectExperience: '',
    competitionExperience: '',
    researchExperience: '',
    internshipExperience: '',
    weeklyHours: null,
    availableSlots: '',
    otherDuties: '',
    expectedDirection: '',
    statement: ''
  }
}

const form = reactive<StudentArchiveSaveReq>(emptyForm())

function validateStatement(_rule: unknown, value: string, callback: (error?: Error) => void) {
  const text = (value ?? '').trim()
  if (text.length === 0) {
    callback()
    return
  }
  if (text.length < 300 || text.length > 800) {
    callback(new Error('个人陈述需为 300-800 字'))
    return
  }
  callback()
}

const rules: FormRules<StudentArchiveSaveReq> = {
  gpa: [{ type: 'number', min: 0, max: 5, message: '绩点需在 0-5 之间', trigger: 'blur' }],
  weeklyHours: [
    { type: 'number', min: 1, max: 40, message: '每周可投入小时需在 1-40 之间', trigger: 'blur' }
  ],
  statement: [{ validator: validateStatement, trigger: 'blur' }]
}

function fillForm(data: StudentArchive) {
  Object.assign(form, {
    className: data.className,
    gpa: data.gpa,
    ranking: data.ranking,
    englishLevel: data.englishLevel,
    programmingLanguages: data.programmingLanguages,
    techStack: data.techStack,
    projectExperience: data.projectExperience,
    competitionExperience: data.competitionExperience,
    researchExperience: data.researchExperience,
    internshipExperience: data.internshipExperience,
    weeklyHours: data.weeklyHours,
    availableSlots: data.availableSlots,
    otherDuties: data.otherDuties,
    expectedDirection: data.expectedDirection,
    statement: data.statement
  })
}

async function loadArchive() {
  loading.value = true
  try {
    const data = await getMyArchive()
    archive.value = data
    if (data) {
      missingFields.value = data.missingFields
      fillForm(data)
    } else {
      missingFields.value = Object.keys(missingFieldLabels)
      Object.assign(form, emptyForm())
    }
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

async function handleSave(goIntention: boolean) {
  if (!formRef.value) {
    return
  }
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) {
    return
  }
  saving.value = true
  try {
    const missing = await saveMyArchive({ ...form })
    missingFields.value = missing
    if (missing.length === 0) {
      ElMessage.success('档案已完善')
    } else {
      ElMessage.warning(`已保存，还有 ${missing.length} 项必填未完成`)
    }
    if (goIntention) {
      await router.push('/student/intention')
    }
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    saving.value = false
  }
}

onMounted(loadArchive)
</script>

<style scoped>
.archive-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.page-header h2 {
  margin: 0 0 6px;
  font-size: 20px;
}

.subtitle {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.missing-alert {
  margin-bottom: 4px;
}

.section {
  margin-bottom: 16px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2d3d;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

.full-width {
  width: 100%;
}

.unit {
  margin-left: 8px;
  font-size: 13px;
  color: #909399;
}

.statement-hint {
  margin: 0;
  font-size: 12px;
  color: #909399;
}

.footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-bottom: 24px;
}
</style>
