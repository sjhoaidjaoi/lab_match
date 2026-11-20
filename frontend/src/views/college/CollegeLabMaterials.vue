<template>
  <div class="page lab-materials">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h2 class="page-title">实训室资料管理</h2>
          <p class="page-desc">学院统一维护六个实训室的基础资料、教师团队与招生名额，各端读取同一份数据。</p>
        </div>
        <div class="header-tools">
          <el-select v-model="academicYear" class="year-select" @change="load">
            <el-option v-for="year in years" :key="year" :label="`${year} 学年`" :value="year" />
          </el-select>
          <el-button @click="openAllFiles">全院宣传资料</el-button>
          <el-button type="primary" @click="openCreate">新增实训室</el-button>
        </div>
      </div>
    </div>

    <div class="stat-grid">
      <div v-for="item in statCards" :key="item.label" class="stat-card">
        <span class="stat-label">{{ item.label }}</span>
        <strong class="stat-value">{{ item.value }}<i v-if="item.unit">{{ item.unit }}</i></strong>
        <span class="stat-hint">{{ item.hint }}</span>
      </div>
    </div>

    <div class="toolbar">
      <el-input v-model="keyword" class="search" placeholder="搜索编号 / 名称 / 位置 / 研究方向" clearable>
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-radio-group v-model="sortKey">
        <el-radio-button value="code">按编号</el-radio-button>
        <el-radio-button value="teachers">按教师数</el-radio-button>
        <el-radio-button value="quota">按名额</el-radio-button>
        <el-radio-button value="completeness">按完善度</el-radio-button>
      </el-radio-group>
      <el-checkbox v-model="onlyIncomplete" label="仅看资料未完善" />
    </div>

    <div v-loading="loading" class="card-grid">
      <article v-for="lab in rows" :key="lab.id" class="lab-card">
        <header class="lab-card-head">
          <span class="lab-code">{{ lab.labCode || '—' }}</span>
          <div class="lab-title">
            <h3>{{ lab.displayName }}</h3>
            <p class="lab-sub">{{ lab.college || '所属学院待完善' }} · {{ lab.location || '位置待完善' }}</p>
          </div>
          <el-tag v-if="lab.leaderName" size="small" effect="plain" type="success">{{ lab.leaderName }}</el-tag>
          <el-tag v-else size="small" effect="plain" type="warning">未设组长</el-tag>
        </header>

        <p class="lab-direction">{{ lab.researchDirection || lab.projectDirection || '研究方向待完善' }}</p>

        <div class="lab-metrics">
          <div><span>教师</span><b>{{ lab.teacherCount }}</b></div>
          <div><span>总名额</span><b>{{ lab.totalQuota }}</b></div>
          <div><span>已分配</span><b>{{ lab.allocatedQuota }}</b></div>
          <div><span>已录取</span><b>{{ lab.enrolled }}</b></div>
        </div>

        <div class="lab-completeness">
          <span>资料完善度 {{ lab.completeness }}%</span>
          <el-progress :percentage="lab.completeness" :stroke-width="6" :show-text="false"
            :status="lab.completeness >= 80 ? 'success' : undefined" />
        </div>

        <footer class="lab-card-foot">
          <el-button text type="primary" @click="openDetail(lab, 'profile')">查看详情</el-button>
          <el-button type="primary" plain @click="openDetail(lab, 'edit')">编辑资料</el-button>
        </footer>
      </article>

      <el-empty v-if="!loading && !rows.length" class="empty-block" description="没有符合条件的实训室" />
    </div>

    <el-drawer v-model="filesDrawer.visible" title="全院宣传资料" size="70%" @open="loadAllFiles">
      <div class="drawer-toolbar">
        <el-select v-model="filesDrawer.labId" clearable placeholder="全部实训室" class="year-select" @change="loadAllFiles">
          <el-option v-for="lab in labs" :key="lab.id" :label="`${lab.labCode} ${lab.displayName}`" :value="lab.id" />
        </el-select>
        <el-input v-model="filesDrawer.keyword" class="search" placeholder="按文件名搜索" clearable @change="loadAllFiles" />
      </div>
      <LabPromotionFiles
        :lab-id="0"
        :editable="true"
        :show-lab="true"
        :preset="filesDrawer.files"
        @changed="loadAllFiles"
      />
    </el-drawer>

    <el-dialog v-model="create.visible" title="新增实训室" width="520px">
      <el-form ref="createRef" :model="create.form" :rules="createRules" label-width="96px">
        <el-form-item label="实训室编号" prop="labCode">
          <el-input v-model="create.form.labCode" maxlength="32" placeholder="如 202" />
        </el-form-item>
        <el-form-item label="实训室名称" prop="name">
          <el-input v-model="create.form.name" maxlength="128" placeholder="选填，可稍后完善" />
        </el-form-item>
      </el-form>
      <p class="dialog-hint">除编号外其余字段可留空，后续在详情页逐步完善。</p>
      <template #footer>
        <el-button @click="create.visible = false">取消</el-button>
        <el-button type="primary" :loading="create.submitting" @click="submitCreate">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { labProfileApi, type LabPromotionFile, type LabSummaryRow } from '@/api/labProfiles'
import LabPromotionFiles from '@/components/lab/LabPromotionFiles.vue'

const router = useRouter()

const labs = ref<LabSummaryRow[]>([])
const stats = ref({ labCount: 0, teacherCount: 0, totalQuota: 0, allocatedQuota: 0, unallocatedQuota: 0, enrolled: 0 })
const years = ref<string[]>([])
const academicYear = ref('')
const loading = ref(false)
const keyword = ref('')
const sortKey = ref<'code' | 'teachers' | 'quota' | 'completeness'>('code')
const onlyIncomplete = ref(false)

const statCards = computed(() => [
  { label: '实训室总数', value: stats.value.labCount, unit: '个', hint: '学院统一建档' },
  { label: '教师总人数', value: stats.value.teacherCount, unit: '人', hint: `${academicYear.value || '当前'} 学年在册` },
  { label: '本学年招生总名额', value: stats.value.totalQuota, unit: '人', hint: '各实训室计划合计' },
  { label: '已分配教师招生名额', value: stats.value.allocatedQuota, unit: '人', hint: `未分配 ${stats.value.unallocatedQuota} 人` }
])

const rows = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  const list = labs.value
    .filter((lab) => (onlyIncomplete.value ? lab.completeness < 100 : true))
    .filter((lab) => !kw || [lab.labCode, lab.displayName, lab.college, lab.location, lab.researchDirection, lab.leaderName]
      .filter(Boolean).some((text) => String(text).toLowerCase().includes(kw)))
  const sorted = [...list]
  if (sortKey.value === 'teachers') sorted.sort((a, b) => b.teacherCount - a.teacherCount)
  else if (sortKey.value === 'quota') sorted.sort((a, b) => b.totalQuota - a.totalQuota)
  else if (sortKey.value === 'completeness') sorted.sort((a, b) => b.completeness - a.completeness)
  else sorted.sort((a, b) => String(a.labCode).localeCompare(String(b.labCode)))
  return sorted
})

async function load() {
  loading.value = true
  try {
    const data = await labProfileApi.overview(academicYear.value || undefined)
    labs.value = data.labs
    stats.value = data.stats
    years.value = data.academicYears
    if (!academicYear.value) academicYear.value = data.academicYear
  } catch { /* 请求层已提示 */ }
  finally { loading.value = false }
}

function openDetail(lab: LabSummaryRow, tab: 'profile' | 'edit') {
  router.push({ path: `/college/lab-materials/${lab.id}`, query: tab === 'edit' ? { tab: 'profile', edit: '1' } : undefined })
}

/* ---------- 全院宣传资料 ---------- */
const filesDrawer = reactive({
  visible: false,
  labId: null as number | null,
  keyword: '',
  files: [] as LabPromotionFile[]
})

function openAllFiles() {
  filesDrawer.visible = true
}

async function loadAllFiles() {
  try {
    filesDrawer.files = await labProfileApi.allFiles({
      laboratoryId: filesDrawer.labId ?? undefined,
      keyword: filesDrawer.keyword.trim() || undefined
    })
  } catch { /* 请求层已提示 */ }
}

/* ---------- 新增实训室 ---------- */
const create = reactive({
  visible: false,
  submitting: false,
  form: { labCode: '', name: '' }
})
const createRef = ref<FormInstance>()
const createRules: FormRules = {
  labCode: [{ required: true, message: '请输入实训室编号', trigger: 'blur' }]
}

function openCreate() {
  create.form.labCode = ''
  create.form.name = ''
  create.visible = true
}

async function submitCreate() {
  if (!createRef.value) return
  await createRef.value.validate(async (valid) => {
    if (!valid) return
    create.submitting = true
    try {
      const created = await labProfileApi.createLab({
        labCode: create.form.labCode.trim(),
        name: create.form.name.trim()
      })
      ElMessage.success('实训室已创建')
      create.visible = false
      await load()
      router.push(`/college/lab-materials/${created.id}`)
    } catch { /* 请求层已提示（编号重复等） */ }
    finally { create.submitting = false }
  })
}

onMounted(load)
</script>

<style scoped>
.lab-materials { display: grid; gap: 18px; }
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.header-tools { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.year-select { width: 168px; }

.stat-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.stat-card {
  display: grid; gap: 6px; padding: 18px 20px; border-radius: var(--lm-radius);
  background-color: var(--workspace-paper); border: 0; -webkit-backdrop-filter: blur(6px) saturate(175%); backdrop-filter: blur(6px) saturate(175%); box-shadow: inset 0 1px 0 rgba(255,255,255,.94), inset 0 -1px 0 rgba(255,255,255,.6), var(--lg-shadow);
  box-shadow: 0 1px 2px rgba(31, 35, 40, .04);
}
.stat-label { font-size: 13px; color: var(--lm-text-secondary); }
.stat-value { font-size: 30px; line-height: 1.1; color: var(--lm-text); font-variant-numeric: tabular-nums; }
.stat-value i { margin-left: 4px; font-size: 13px; font-style: normal; color: var(--lm-text-secondary); }
.stat-hint { font-size: 12px; color: var(--lm-text-secondary); }

.toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.toolbar .search { width: min(100%, 340px); }

.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; min-height: 120px; }
.lab-card {
  display: grid; gap: 14px; padding: 20px; border-radius: var(--lm-radius);
  background-color: var(--workspace-paper); border: 0; -webkit-backdrop-filter: blur(6px) saturate(175%); backdrop-filter: blur(6px) saturate(175%); box-shadow: inset 0 1px 0 rgba(255,255,255,.94), inset 0 -1px 0 rgba(255,255,255,.6), var(--lg-shadow);
  transition: box-shadow .18s ease, transform .18s ease, border-color .18s ease;
}
.lab-card:hover { border-color: #f3c6a8; box-shadow: 0 10px 26px rgba(234, 88, 12, .10); transform: translateY(-2px); }
.lab-card-head { display: flex; align-items: center; gap: 12px; }
.lab-code {
  flex: none; display: grid; place-items: center; width: 54px; height: 54px; border-radius: 14px;
  background: linear-gradient(135deg, #ea580c, #f97316); color: #fff;
  font-weight: 700; font-size: 17px; letter-spacing: .02em;
}
.lab-title { min-width: 0; flex: 1; }
.lab-title h3 { margin: 0; font-size: 17px; color: var(--lm-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lab-sub { margin: 4px 0 0; font-size: 12px; color: var(--lm-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lab-direction {
  margin: 0; min-height: 40px; font-size: 13px; line-height: 1.6; color: var(--lm-text-secondary);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.lab-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.lab-metrics div {
  display: grid; gap: 2px; padding: 10px 8px; border-radius: 10px; background: var(--lm-bg); text-align: center;
}
.lab-metrics span { font-size: 11px; color: var(--lm-text-secondary); }
.lab-metrics b { font-size: 17px; color: var(--lm-text); font-variant-numeric: tabular-nums; }
.lab-completeness { display: grid; gap: 6px; font-size: 12px; color: var(--lm-text-secondary); }
.lab-card-foot { display: flex; justify-content: flex-end; gap: 8px; }
.empty-block { grid-column: 1 / -1; }
.dialog-hint { margin: 0 0 0 96px; font-size: 12px; color: var(--lm-text-secondary); }
.drawer-toolbar { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }

@media (max-width: 1100px) {
  .stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 640px) {
  .stat-grid { grid-template-columns: minmax(0, 1fr); }
  .card-grid { grid-template-columns: minmax(0, 1fr); }
}
</style>
