<template>
  <div v-loading="loading" class="page lab-material-detail">
    <div class="detail-head">
      <el-button text class="back" @click="router.push('/college/lab-materials')">
        <el-icon><ArrowLeft /></el-icon>返回实训室列表
      </el-button>
      <div class="head-main">
        <span class="lab-code">{{ lab?.labCode || '—' }}</span>
        <div class="head-title">
          <h2>{{ lab?.displayName || '实训室详情' }}</h2>
          <p>
            {{ lab?.college || '所属学院待完善' }}
            <template v-if="lab?.location"> · {{ lab.location }}</template>
            · 组长 {{ lab?.leaderName || '未指定' }}
            · 资料完善度 {{ lab?.completeness ?? 0 }}%
          </p>
        </div>
        <el-select v-model="academicYear" class="year-select" @change="onYearChange">
          <el-option v-for="year in years" :key="year" :label="`${year} 学年`" :value="year" />
        </el-select>
      </div>
    </div>

    <el-tabs v-if="lab" v-model="tab" class="detail-tabs" @tab-change="onTabChange">
      <!-- ---------------- 基础资料 ---------------- -->
      <el-tab-pane label="基础资料" name="profile">
        <el-card shadow="never">
          <template #header>
            <div class="card-head">
              <span>实训室基础资料</span>
              <div class="card-actions">
                <el-button :disabled="!dirty" @click="resetProfile">取消修改</el-button>
                <el-button type="primary" :loading="savingProfile" :disabled="!dirty" @click="saveProfile">保存资料</el-button>
              </div>
            </div>
          </template>
          <el-form ref="profileRef" :model="profile" :rules="profileRules" label-position="top" class="profile-form">
            <div class="field-grid">
              <el-form-item label="实训室编号" prop="labCode">
                <el-input v-model="profile.labCode" maxlength="32" placeholder="如 202" />
              </el-form-item>
              <el-form-item label="实训室名称">
                <el-input v-model="profile.name" maxlength="128" placeholder="选填" />
              </el-form-item>
              <el-form-item label="所属学院">
                <el-input v-model="profile.college" maxlength="128" placeholder="如 软件学院" />
              </el-form-item>
              <el-form-item label="实训室位置">
                <el-input v-model="profile.location" maxlength="128" placeholder="如 实验楼 A202" />
              </el-form-item>
            </div>
            <el-form-item label="实训室简介">
              <el-input v-model="profile.description" type="textarea" :rows="3" maxlength="5000" show-word-limit
                placeholder="面向学生的简要介绍，将展示在学生端实训室介绍页" />
            </el-form-item>
            <el-form-item label="详细介绍">
              <el-input v-model="profile.detail" type="textarea" :rows="5" maxlength="20000" show-word-limit
                placeholder="培养目标、课程体系、发展方向等" />
            </el-form-item>
            <div class="field-grid">
              <el-form-item label="主要研究方向">
                <el-input v-model="profile.researchDirection" maxlength="512" placeholder="如 软件工程、智能系统" />
              </el-form-item>
              <el-form-item label="主要项目方向">
                <el-input v-model="profile.projectDirection" maxlength="512" />
              </el-form-item>
              <el-form-item label="技术栈">
                <el-input v-model="profile.technologyStack" maxlength="512" />
              </el-form-item>
              <el-form-item label="联系方式">
                <el-input v-model="profile.contact" maxlength="512" placeholder="电话 / 邮箱 / 办公地点" />
              </el-form-item>
            </div>
            <el-form-item label="实训室特色">
              <el-input v-model="profile.features" type="textarea" :rows="3" maxlength="5000" show-word-limit />
            </el-form-item>
            <el-form-item label="主要研究成果">
              <el-input v-model="profile.achievements" type="textarea" :rows="3" maxlength="10000" show-word-limit />
            </el-form-item>
            <el-form-item label="实训室设备及资源">
              <el-input v-model="profile.equipment" type="textarea" :rows="3" maxlength="10000" show-word-limit />
            </el-form-item>
            <el-form-item label="其他备注">
              <el-input v-model="profile.remark" type="textarea" :rows="2" maxlength="5000" show-word-limit />
            </el-form-item>
            <p class="form-hint">未填写的字段保持为空，各端将显示「待完善」，不会填充任何系统推测内容。</p>
          </el-form>
        </el-card>
      </el-tab-pane>

      <!-- ---------------- 教师管理 ---------------- -->
      <el-tab-pane label="教师管理" name="teachers">
        <el-card shadow="never">
          <template #header>
            <div class="card-head">
              <span>教师信息（{{ teacherRows.length }} 人）</span>
              <div class="card-actions">
                <el-input v-model="teacherKeyword" class="mini-search" placeholder="按姓名搜索" clearable />
                <el-select v-model="teacherIdentity" class="mini-select">
                  <el-option label="全部身份" value="ALL" />
                  <el-option label="实训室组长" value="LEADER" />
                  <el-option label="普通教师" value="TEACHER" />
                </el-select>
                <el-button type="primary" @click="openTeacherDrawer(null)">新增教师</el-button>
              </div>
            </div>
          </template>
          <el-table :data="teacherRows" stripe empty-text="尚未录入教师，请点击「新增教师」">
            <el-table-column label="姓名" min-width="120">
              <template #default="{ row }">
                <div class="teacher-name">
                  <el-avatar :size="28" :src="row.photoUrl || undefined">{{ row.name.slice(0, 1) }}</el-avatar>
                  <span>{{ row.name }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="employeeNo" label="教师编号" width="120">
              <template #default="{ row }">{{ row.employeeNo || '—' }}</template>
            </el-table-column>
            <el-table-column label="身份" width="104">
              <template #default="{ row }">
                <el-tag :type="row.identity === 'LEADER' ? 'success' : 'info'" effect="plain" size="small">
                  {{ row.identity === 'LEADER' ? '实训室组长' : '普通教师' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="职称 / 学位" min-width="140">
              <template #default="{ row }">{{ [row.title, row.degree].filter(Boolean).join(' / ') || '—' }}</template>
            </el-table-column>
            <el-table-column prop="direction" label="研究方向" min-width="160" show-overflow-tooltip>
              <template #default="{ row }">{{ row.direction || '—' }}</template>
            </el-table-column>
            <el-table-column label="本学年名额" width="110" align="center">
              <template #default="{ row }">{{ row.quota }}</template>
            </el-table-column>
            <el-table-column label="关联账号" width="130">
              <template #default="{ row }">
                <span v-if="row.userId">{{ row.accountName || '已绑定' }}</span>
                <span v-else class="muted">未绑定</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="210" align="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="openTeacherDrawer(row)">编辑</el-button>
                <el-button v-if="row.identity !== 'LEADER'" link type="primary"
                  :disabled="!leaderCandidates.length" @click="setLeader(row)">设为组长</el-button>
                <el-button link type="danger" @click="removeTeacher(row)">移除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <p class="form-hint">
            教师资料与登录账号分开建模：新增教师不会自动创建登录账号。已有报名、面试或录取记录的教师移除后只解除关联，历史记录保留。
          </p>
        </el-card>
      </el-tab-pane>

      <!-- ---------------- 招生名额 ---------------- -->
      <el-tab-pane label="招生名额" name="quotas">
        <div class="quota-wrap">
          <el-card shadow="never">
            <template #header>
              <div class="card-head">
                <span>实训室招生名额 · {{ academicYear }} 学年</span>
                <div class="card-actions">
                  <el-input-number v-model="totalQuotaInput" :min="0" :max="100000" :step="1" step-strict
                    controls-position="right" class="quota-input" />
                  <el-button type="primary" :loading="savingPlan" @click="savePlan">保存总名额</el-button>
                </div>
              </div>
            </template>
            <div class="quota-stats">
              <div><span>总名额</span><b>{{ quota.totalQuota }}</b></div>
              <div><span>已分配</span><b>{{ quota.allocatedQuota }}</b></div>
              <div><span>未分配</span><b :class="{ warn: quota.unallocatedQuota > 0 }">{{ quota.unallocatedQuota }}</b></div>
              <div><span>已录取</span><b>{{ quota.enrolled }}</b></div>
            </div>
            <el-progress class="quota-bar" :stroke-width="10"
              :percentage="quota.totalQuota ? Math.min(100, Math.round(quota.allocatedQuota / quota.totalQuota * 100)) : 0"
              :status="quota.allocatedQuota === quota.totalQuota ? 'success' : undefined" />
            <p class="form-hint">教师名额合计不得超过实训室总名额；已录取人数不得超过对应教师名额。不同学年独立存储，互不覆盖。</p>
          </el-card>

          <el-card shadow="never">
            <template #header>
              <div class="card-head">
                <span>教师名额分配</span>
                <div class="card-actions">
                  <el-button :disabled="!quotaDirty" @click="resetQuotas">撤销修改</el-button>
                  <el-button type="primary" :loading="savingQuotas" :disabled="!quotaDirty" @click="saveQuotas">保存分配</el-button>
                </div>
              </div>
            </template>
            <el-table :data="quota.teachers || []" stripe empty-text="请先在「教师管理」录入教师">
              <el-table-column prop="name" label="教师姓名" min-width="140">
                <template #default="{ row }">
                  <span>{{ row.name }}</span>
                  <el-tag v-if="row.identity === 'LEADER'" size="small" effect="plain" class="leader-tag">组长</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="employeeNo" label="教师编号" width="120">
                <template #default="{ row }">{{ row.employeeNo || '—' }}</template>
              </el-table-column>
              <el-table-column label="当前学年分配名额" width="180" align="center">
                <template #default="{ row }">
                  <el-input-number v-model="quotaDraft[row.id]" :min="0" :max="100000" :step="1" step-strict
                    controls-position="right" class="quota-input" />
                </template>
              </el-table-column>
              <el-table-column label="已录取" width="90" align="center">
                <template #default="{ row }">{{ row.enrolled }}</template>
              </el-table-column>
              <el-table-column label="剩余可录取" width="110" align="center">
                <template #default="{ row }">{{ Math.max(0, (quotaDraft[row.id] ?? row.quota) - row.enrolled) }}</template>
              </el-table-column>
            </el-table>
            <p class="form-hint">
              合计 {{ draftTotal }} 人 / 总名额 {{ quota.totalQuota }} 人
              <span v-if="draftTotal > quota.totalQuota" class="over">超出 {{ draftTotal - quota.totalQuota }} 人，无法保存</span>
            </p>
          </el-card>
        </div>
      </el-tab-pane>

      <!-- ---------------- 宣传资料 ---------------- -->
      <el-tab-pane label="宣传资料" name="files">
        <el-card shadow="never">
          <LabPromotionFiles :lab-id="lab.id" editable @changed="load" />
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- 教师编辑抽屉 -->
    <el-drawer v-model="teacherDrawer.visible" :title="teacherDrawer.id ? '编辑教师资料' : '新增教师'" size="520px">
      <el-form ref="teacherRef" :model="teacherForm" :rules="teacherRules" label-position="top">
        <div class="field-grid">
          <el-form-item label="教师姓名" prop="name">
            <el-input v-model="teacherForm.name" maxlength="64" />
          </el-form-item>
          <el-form-item label="教师编号">
            <el-input v-model="teacherForm.employeeNo" maxlength="64" placeholder="工号，全院唯一" />
          </el-form-item>
          <el-form-item label="性别（可选）">
            <el-select v-model="teacherForm.gender" clearable placeholder="不填">
              <el-option label="男" value="男" />
              <el-option label="女" value="女" />
            </el-select>
          </el-form-item>
          <el-form-item label="教师身份">
            <el-select v-model="teacherForm.identity">
              <el-option label="普通教师" value="TEACHER" />
              <el-option label="实训室组长" value="LEADER" />
            </el-select>
          </el-form-item>
          <el-form-item label="职称">
            <el-input v-model="teacherForm.title" maxlength="64" placeholder="如 副教授" />
          </el-form-item>
          <el-form-item label="学历 / 学位">
            <el-input v-model="teacherForm.degree" maxlength="64" placeholder="如 博士" />
          </el-form-item>
        </div>
        <el-form-item label="研究方向">
          <el-input v-model="teacherForm.direction" maxlength="512" />
        </el-form-item>
        <el-form-item label="负责项目">
          <el-input v-model="teacherForm.project" type="textarea" :rows="2" maxlength="2000" show-word-limit />
        </el-form-item>
        <el-form-item label="教师个人简介">
          <el-input v-model="teacherForm.intro" type="textarea" :rows="3" maxlength="5000" show-word-limit />
        </el-form-item>
        <div class="field-grid">
          <el-form-item label="联系邮箱" prop="email">
            <el-input v-model="teacherForm.email" maxlength="128" placeholder="name@example.edu.cn" />
          </el-form-item>
          <el-form-item label="办公地点">
            <el-input v-model="teacherForm.office" maxlength="128" />
          </el-form-item>
        </div>
        <el-form-item label="教师照片链接">
          <el-input v-model="teacherForm.photoUrl" maxlength="1024" placeholder="https://…（选填）" />
        </el-form-item>
        <el-form-item label="关联登录账号（选填）">
          <el-select v-model="teacherForm.userId" clearable placeholder="不关联账号" class="full">
            <el-option v-for="account in accountOptions" :key="account.id"
              :label="`${account.realName || account.username}（${account.username}）`" :value="account.id"
              :disabled="boundAccountIds.includes(account.id) && account.id !== teacherForm.userId" />
          </el-select>
        </el-form-item>
        <el-form-item label="其他备注">
          <el-input v-model="teacherForm.remark" type="textarea" :rows="2" maxlength="2000" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="teacherDrawer.visible = false">取消</el-button>
        <el-button type="primary" :loading="teacherDrawer.saving" @click="submitTeacher">保存</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import {
  labProfileApi, type LabProfileDetail, type LabProfilePayload,
  type LabQuotaSummary, type LabTeacherItem, type LabTeacherPayload
} from '@/api/labProfiles'
import { collegeApi, listOf } from '@/api/college'
import type { UserAccount } from '@/types'
import LabPromotionFiles from '@/components/lab/LabPromotionFiles.vue'

const route = useRoute()
const router = useRouter()
const labId = computed(() => Number(route.params.id))

const lab = ref<LabProfileDetail>()
const loading = ref(false)
const tab = ref('profile')
const academicYear = ref('')
const years = ref<string[]>([])

const blankProfile = (): LabProfilePayload => ({
  labCode: '', name: '', college: '', location: '', description: '', detail: '',
  researchDirection: '', projectDirection: '', technologyStack: '', features: '',
  achievements: '', equipment: '', contact: '', remark: ''
})
const profile = reactive<LabProfilePayload>(blankProfile())
const profileRef = ref<FormInstance>()
const profileRules: FormRules = {
  labCode: [{ required: true, message: '请输入实训室编号', trigger: 'blur' }]
}
const savingProfile = ref(false)

const PROFILE_FIELDS = Object.keys(blankProfile()) as Array<keyof LabProfilePayload>

function fillProfile(source?: Partial<LabProfileDetail>) {
  PROFILE_FIELDS.forEach((field) => {
    const value = source?.[field as keyof LabProfileDetail]
    ;(profile as Record<string, unknown>)[field] = typeof value === 'string' ? value : ''
  })
}

const dirty = computed(() => {
  if (!lab.value) return false
  return PROFILE_FIELDS.some((field) => {
    const next = (profile[field] ?? '').trim()
    const prev = String(lab.value?.[field as keyof LabProfileDetail] ?? '').trim()
    return next !== prev
  })
})

function resetProfile() {
  fillProfile(lab.value)
}

async function saveProfile() {
  if (!profileRef.value) return
  await profileRef.value.validate(async (valid) => {
    if (!valid) return
    savingProfile.value = true
    try {
      const payload: LabProfilePayload = {}
      PROFILE_FIELDS.forEach((field) => {
        const value = (profile[field] ?? '').trim()
        if (value !== String(lab.value?.[field as keyof LabProfileDetail] ?? '').trim()) {
          ;(payload as Record<string, string>)[field] = value
        }
      })
      await labProfileApi.updateProfile(labId.value, payload)
      ElMessage.success('实训室资料已保存，各端将读取最新内容')
      await load()
    } catch { /* 请求层已提示 */ }
    finally { savingProfile.value = false }
  })
}

/* ---------------- 教师 ---------------- */
const teacherKeyword = ref('')
const teacherIdentity = ref<'ALL' | 'LEADER' | 'TEACHER'>('ALL')
const accounts = ref<UserAccount[]>([])

const teacherRows = computed(() => (lab.value?.teachers || [])
  .filter((item) => (teacherIdentity.value === 'ALL' ? true : item.identity === teacherIdentity.value))
  .filter((item) => !teacherKeyword.value.trim() || item.name.includes(teacherKeyword.value.trim())))

const accountOptions = computed(() => accounts.value.filter((item) => item.laboratoryId === labId.value))
const boundAccountIds = computed(() => (lab.value?.teachers || [])
  .map((item) => item.userId).filter((id): id is number => id != null))
const leaderCandidates = computed(() => accountOptions.value.filter((item) => item.role === 'LAB_LEADER' && item.status === 'ACTIVE'))

const teacherDrawer = reactive({ visible: false, saving: false, id: null as number | null })
const teacherRef = ref<FormInstance>()
const teacherForm = reactive<LabTeacherPayload & { userId: number | null }>({
  name: '', employeeNo: '', gender: '', title: '', degree: '', direction: '', project: '',
  intro: '', email: '', office: '', photoUrl: '', remark: '', identity: 'TEACHER', userId: null
})
const teacherRules: FormRules = {
  name: [{ required: true, message: '请输入教师姓名', trigger: 'blur' }],
  email: [{ pattern: /^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: '请输入有效邮箱', trigger: 'blur' }]
}

function openTeacherDrawer(row: LabTeacherItem | null) {
  teacherDrawer.id = row?.id ?? null
  Object.assign(teacherForm, {
    name: row?.name ?? '', employeeNo: row?.employeeNo ?? '', gender: row?.gender ?? '',
    title: row?.title ?? '', degree: row?.degree ?? '', direction: row?.direction ?? '',
    project: row?.project ?? '', intro: row?.intro ?? '', email: row?.email ?? '',
    office: row?.office ?? '', photoUrl: row?.photoUrl ?? '', remark: row?.remark ?? '',
    identity: row?.identity ?? 'TEACHER', userId: row?.userId ?? null
  })
  teacherDrawer.visible = true
}

async function submitTeacher() {
  if (!teacherRef.value) return
  await teacherRef.value.validate(async (valid) => {
    if (!valid) return
    teacherDrawer.saving = true
    try {
      const payload: LabTeacherPayload = { ...teacherForm }
      if (teacherDrawer.id) {
        await labProfileApi.updateTeacher(labId.value, teacherDrawer.id, payload)
        ElMessage.success('教师资料已保存')
      } else {
        await labProfileApi.createTeacher(labId.value, payload)
        ElMessage.success('教师已新增')
      }
      teacherDrawer.visible = false
      await load()
    } catch { /* 请求层已提示 */ }
    finally { teacherDrawer.saving = false }
  })
}

async function removeTeacher(row: LabTeacherItem) {
  try {
    await ElMessageBox.confirm(
      `确认从本实训室移除「${row.name}」？若该教师已有报名、面试或录取记录，仅解除关联并保留历史数据。`,
      '移除教师',
      { type: 'warning', confirmButtonText: '确认移除', cancelButtonText: '取消', confirmButtonClass: 'el-button--danger' }
    )
  } catch { return }
  try {
    const result = await labProfileApi.removeTeacher(labId.value, row.id)
    ElMessage.success(result.retainedHistory ? '已解除关联，历史业务记录保留' : '教师已移除')
    await load()
  } catch { /* 请求层已提示 */ }
}

async function setLeader(row: LabTeacherItem) {
  const candidates = leaderCandidates.value.filter((item) => !boundAccountIds.value.includes(item.id) || item.id === row.userId)
  const pick = row.userId
    ? row.userId
    : candidates.length === 1 ? candidates[0].id : null
  if (!pick) {
    ElMessage.warning(candidates.length
      ? '该教师尚未关联账号，请先在编辑中选择关联本室组长账号'
      : '本实训室暂无可用组长账号，请先在「实训室与组长管理」中创建')
    openTeacherDrawer(row)
    return
  }
  try {
    await ElMessageBox.confirm(`确认将「${row.name}」设为本实训室组长？`, '设置组长', { type: 'warning' })
  } catch { return }
  try {
    await labProfileApi.setLeader(labId.value, { teacherId: row.id })
    ElMessage.success('组长已设置')
    await load()
  } catch { /* 请求层已提示 */ }
}

/* ---------------- 名额 ---------------- */
const quota = ref<LabQuotaSummary>({
  academicYear: '', batchId: null, totalQuota: 0, allocatedQuota: 0,
  unallocatedQuota: 0, enrolled: 0, teacherCount: 0, teachers: []
})
const totalQuotaInput = ref(0)
const quotaDraft = reactive<Record<number, number>>({})
const savingPlan = ref(false)
const savingQuotas = ref(false)

const draftTotal = computed(() => Object.values(quotaDraft).reduce((sum, value) => sum + (Number(value) || 0), 0))
const quotaDirty = computed(() => (quota.value.teachers || [])
  .some((item) => (quotaDraft[item.id] ?? item.quota) !== item.quota))

function syncQuotaState() {
  totalQuotaInput.value = quota.value.totalQuota
  Object.keys(quotaDraft).forEach((key) => delete quotaDraft[Number(key)])
  ;(quota.value.teachers || []).forEach((item) => { quotaDraft[item.id] = item.quota })
}

function resetQuotas() {
  syncQuotaState()
}

async function savePlan() {
  savingPlan.value = true
  try {
    quota.value = await labProfileApi.updatePlan(labId.value, {
      academicYear: academicYear.value, totalQuota: totalQuotaInput.value
    })
    syncQuotaState()
    ElMessage.success('招生总名额已保存')
    await load()
  } catch { /* 请求层已提示 */ }
  finally { savingPlan.value = false }
}

async function saveQuotas() {
  if (draftTotal.value > quota.value.totalQuota) {
    ElMessage.warning(`教师名额合计 ${draftTotal.value} 人，超过总名额 ${quota.value.totalQuota} 人`)
    return
  }
  savingQuotas.value = true
  try {
    quota.value = await labProfileApi.updateTeacherQuotas(labId.value, {
      academicYear: academicYear.value,
      items: (quota.value.teachers || []).map((item) => ({ labTeacherId: item.id, quota: quotaDraft[item.id] ?? item.quota }))
    })
    syncQuotaState()
    ElMessage.success('教师名额分配已保存')
    await load()
  } catch { /* 请求层已提示 */ }
  finally { savingQuotas.value = false }
}

/* ---------------- 加载 ---------------- */
async function load() {
  loading.value = true
  try {
    const [detail, accountsRes] = await Promise.all([
      labProfileApi.detail(labId.value, academicYear.value || undefined),
      collegeApi.users({ pageSize: 500 }).then((res) => listOf(res)).catch(() => [] as UserAccount[])
    ])
    lab.value = detail
    accounts.value = accountsRes
    years.value = detail.academicYears
    if (!academicYear.value) academicYear.value = detail.academicYear
    quota.value = detail.quota
    syncQuotaState()
    if (!dirty.value || route.query.tab !== 'profile') fillProfile(detail)
  } catch { /* 请求层已提示 */ }
  finally { loading.value = false }
}

function onYearChange() {
  void load()
}

function onTabChange(name: string | number) {
  if (name === 'quotas' || name === 'teachers') void load()
}

onMounted(async () => {
  if (typeof route.query.tab === 'string') tab.value = route.query.tab
  await load()
})
</script>

<style scoped>
.lab-material-detail { display: grid; gap: 16px; }
.detail-head { display: grid; gap: 10px; }
.back { justify-self: start; padding-left: 0; }
.head-main { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.lab-code {
  display: grid; place-items: center; min-width: 58px; height: 58px; padding: 0 10px; border-radius: 16px;
  background: linear-gradient(135deg, #ea580c, #f97316); color: #fff; font-weight: 700; font-size: 18px;
}
.head-title { flex: 1; min-width: 220px; }
.head-title h2 { margin: 0; font-size: 22px; color: var(--lm-text); }
.head-title p { margin: 4px 0 0; font-size: 13px; color: var(--lm-text-secondary); }
.year-select { width: 168px; }
.card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.card-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.field-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 18px; }
.form-hint { margin: 6px 0 0; font-size: 12px; line-height: 1.7; color: var(--lm-text-secondary); }
.teacher-name { display: flex; align-items: center; gap: 8px; }
.leader-tag { margin-left: 8px; }
.muted { color: var(--lm-text-secondary); }
.mini-search { width: 180px; }
.mini-select { width: 140px; }
.quota-input { width: 150px; }
.quota-wrap { display: grid; gap: 16px; }
.quota-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.quota-stats div { display: grid; gap: 4px; padding: 14px 16px; border-radius: 12px; background: var(--lm-bg); }
.quota-stats span { font-size: 12px; color: var(--lm-text-secondary); }
.quota-stats b { font-size: 24px; color: var(--lm-text); font-variant-numeric: tabular-nums; }
.quota-stats b.warn { color: #d97706; }
.quota-bar { margin-top: 14px; }
.over { margin-left: 8px; color: #d64545; font-weight: 600; }
.full { width: 100%; }
@media (max-width: 900px) {
  .field-grid { grid-template-columns: minmax(0, 1fr); }
  .quota-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
