<template>
  <div class="page lab-admin">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h2 class="page-title">实训室与教师管理</h2>
          <p class="page-desc">统筹全院实训室档案，指派唯一组长账号，并在实训室详情里维护本室教师账号与导师名额。宣传物料（PPT / 视频）由实训室组长在本室维护。</p>
        </div>
        <el-button type="primary" @click="openCreateLab">新增实训室</el-button>
      </div>
      <div class="toolbar">
        <el-input v-model="keyword" class="search" placeholder="搜索实训室 / 组长姓名 / 工号" clearable />
        <el-radio-group v-model="bindFilter">
          <el-radio-button value="ALL">全部（{{ labs.length }}）</el-radio-button>
          <el-radio-button value="BOUND">已绑定组长（{{ boundCount }}）</el-radio-button>
          <el-radio-button value="UNBOUND">未绑定组长（{{ labs.length - boundCount }}）</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="rows" stripe empty-text="没有符合条件的实训室">
        <el-table-column label="实训室" min-width="190">
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="router.push(`/college/labs/${row.id}`)">
              {{ row.name }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="projectDirection" label="项目方向" min-width="150" show-overflow-tooltip />
        <el-table-column label="组长账号" min-width="200">
          <template #default="{ row }">
            <template v-if="leaderOf(row)">
              <span class="leader-name">{{ leaderOf(row)!.realName }}</span>
              <span class="leader-no">{{ leaderOf(row)!.username }}</span>
            </template>
            <el-tag v-else type="warning" effect="plain" size="small">未绑定组长</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="账号状态" width="96" align="center">
          <template #default="{ row }">
            <el-tag v-if="leaderOf(row)" :type="leaderOf(row)!.status === 'ACTIVE' ? 'success' : 'info'" effect="light" size="small">
              {{ leaderOf(row)!.status === 'ACTIVE' ? '启用' : '停用' }}
            </el-tag>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="名额 / 报名" width="112" align="center">
          <template #default="{ row }">{{ row.recruitmentQuota }} / {{ row.applicationCount ?? 0 }}</template>
        </el-table-column>
        <el-table-column label="实训室状态" width="104" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'" effect="light" size="small">
              {{ row.status === 'ACTIVE' ? '正常' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" align="right">
          <template #default="{ row }">
            <el-button size="small" text type="primary" @click="router.push(`/college/labs/${row.id}`)">查看</el-button>
            <el-button size="small" text type="primary" @click="router.push({ path: `/college/labs/${row.id}`, query: { tab: 'profile' } })">编辑资料</el-button>
            <el-button v-if="!leaderOf(row)" size="small" type="primary" plain @click="openLeaderCreate(row)">创建组长</el-button>
            <el-dropdown v-else trigger="click" @command="(command: string) => onLeaderCommand(command, row)">
              <el-button size="small" plain>
                组长账号<el-icon class="dropdown-arrow"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="edit">编辑资料与绑定</el-dropdown-item>
                  <el-dropdown-item command="reset">重置登录密码</el-dropdown-item>
                  <el-dropdown-item command="toggle">
                    {{ leaderOf(row)!.status === 'ACTIVE' ? '停用账号' : '启用账号' }}
                  </el-dropdown-item>
                  <el-dropdown-item command="delete" divided>删除账号</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="leaderDialog.visible" :title="leaderDialog.mode === 'create' ? '创建组长账号' : '编辑组长账号'" width="600px">
      <el-form ref="leaderFormRef" :model="leaderForm" :rules="leaderRules" label-width="110px">
        <el-form-item label="姓名" prop="realName">
          <el-input v-model="leaderForm.realName" maxlength="32" placeholder="组长真实姓名" />
        </el-form-item>
        <el-form-item label="工号（账号）" prop="employeeNumber">
          <el-input v-model="leaderForm.employeeNumber" maxlength="64" placeholder="登录账号，须全院唯一" />
        </el-form-item>
        <el-form-item label="所属实训室" prop="laboratoryId">
          <el-select v-model="leaderForm.laboratoryId" placeholder="选择实训室" class="full">
            <el-option
              v-for="item in labs"
              :key="item.id"
              :label="item.name + (occupiedBy(item) ? `（已有组长 ${occupiedBy(item)!.realName}）` : '')"
              :value="item.id"
              :disabled="Boolean(occupiedBy(item)) && occupiedBy(item)!.id !== leaderDialog.userId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="leaderForm.phone" maxlength="20" placeholder="选填" />
        </el-form-item>
        <el-form-item v-if="leaderDialog.mode === 'create'" label="初始密码" prop="password">
          <el-input v-model="leaderForm.password" type="password" show-password maxlength="64" placeholder="留空则使用系统初始密码" />
        </el-form-item>
        <p class="dialog-hint">一个实训室同时只能有一名启用状态的组长；如需更换组长，请先停用原组长或修改其实训室绑定。</p>
      </el-form>
      <template #footer>
        <el-button @click="leaderDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="leaderSubmitting" @click="submitLeader">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="labDialogVisible" title="新建实训室档案" width="620px">
      <el-form ref="labFormRef" :model="labForm" :rules="labRules" label-width="100px">
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="实训室编号" prop="labCode">
              <el-input v-model="labForm.labCode" maxlength="32" placeholder="如 202，全院唯一" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="实训室名称" prop="name">
              <el-input v-model="labForm.name" maxlength="128" placeholder="如：智能软件实训室" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="所属学院">
              <el-input v-model="labForm.college" maxlength="128" placeholder="选填" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="地点">
              <el-input v-model="labForm.location" maxlength="128" placeholder="选填" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="项目方向">
              <el-input v-model="labForm.projectDirection" maxlength="255" placeholder="选填" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="技术栈">
              <el-input v-model="labForm.technologyStack" maxlength="255" placeholder="选填" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="简介">
          <el-input v-model="labForm.description" type="textarea" :rows="3" maxlength="5000" show-word-limit placeholder="选填，面向学生展示" />
        </el-form-item>
      </el-form>
      <p class="dialog-hint">建档后可在列表中为该实训室创建并绑定组长账号；招生名额请在详情页「招生名额」中按学年设置。</p>
      <template #footer>
        <el-button @click="labDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="labSubmitting" @click="submitLab">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import { collegeApi, listOf } from '@/api/college'
import { labProfileApi } from '@/api/labProfiles'
import type { LabView, UserAccount } from '@/types'

const LEADER_ROLE = 'LAB_LEADER'

const router = useRouter()

const labs = ref<LabView[]>([])
const leaders = ref<UserAccount[]>([])
const loading = ref(false)
const keyword = ref('')
const bindFilter = ref<'ALL' | 'BOUND' | 'UNBOUND'>('ALL')

/** 每个实训室当前组长：优先启用状态，其次绑定记录，最后任意历史账号 */
const leaderMap = computed(() => {
  const grouped = new Map<number, UserAccount[]>()
  leaders.value.forEach((user) => {
    if (user.laboratoryId == null) return
    const list = grouped.get(user.laboratoryId) ?? []
    list.push(user)
    grouped.set(user.laboratoryId, list)
  })
  const map = new Map<number, UserAccount>()
  labs.value.forEach((lab) => {
    const list = grouped.get(lab.id) ?? []
    const picked = list.find((user) => user.status === 'ACTIVE')
      ?? list.find((user) => user.id === lab.leaderId)
      ?? list[0]
    if (picked) map.set(lab.id, picked)
  })
  return map
})

function leaderOf(lab: LabView): UserAccount | null {
  return leaderMap.value.get(lab.id) ?? null
}

function occupiedBy(lab: LabView): UserAccount | null {
  const leader = leaderOf(lab)
  return leader && leader.status === 'ACTIVE' ? leader : null
}

const boundCount = computed(() => labs.value.filter((lab) => Boolean(leaderOf(lab))).length)

const rows = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return labs.value.filter((lab) => {
    const leader = leaderOf(lab)
    if (bindFilter.value === 'BOUND' && !leader) return false
    if (bindFilter.value === 'UNBOUND' && leader) return false
    if (!kw) return true
    return [lab.name, lab.projectDirection, lab.technologyStack, lab.leaderName, leader?.realName, leader?.username]
      .filter(Boolean)
      .some((text) => String(text).toLowerCase().includes(kw))
  })
})

async function load() {
  loading.value = true
  try {
    const [labList, accounts, overview] = await Promise.all([
      collegeApi.labs(),
      collegeApi.users({ role: LEADER_ROLE, pageSize: 500 }),
      labProfileApi.overview().catch(() => null)
    ])
    // 名额以「学年计划」口径为准，与详情页「招生名额」保持一致
    const quotaMap = new Map((overview?.labs || []).map((item) => [item.id, item.totalQuota]))
    labs.value = labList.map((lab) => (
      quotaMap.has(lab.id) ? { ...lab, recruitmentQuota: quotaMap.get(lab.id) as number } : lab
    ))
    leaders.value = listOf(accounts).filter((user) => user.role === LEADER_ROLE)
  } catch { /* 请求层已提示读取失败原因 */ }
  finally { loading.value = false }
}

/* ---------------- 新建实训室 ---------------- */
const labDialogVisible = ref(false)
const labSubmitting = ref(false)
const labFormRef = ref<FormInstance>()
const labForm = reactive({
  labCode: '',
  name: '',
  college: '',
  location: '',
  projectDirection: '',
  technologyStack: '',
  description: ''
})
const labRules: FormRules = {
  labCode: [{ required: true, message: '请输入实训室编号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入实训室名称', trigger: 'blur' }]
}

function openCreateLab() {
  Object.assign(labForm, { labCode: '', name: '', college: '', location: '', projectDirection: '', technologyStack: '', description: '' })
  labDialogVisible.value = true
}

async function submitLab() {
  if (!labFormRef.value) return
  await labFormRef.value.validate(async (valid) => {
    if (!valid) return
    labSubmitting.value = true
    try {
      const created = await labProfileApi.createLab({
        labCode: labForm.labCode.trim(),
        name: labForm.name.trim(),
        college: labForm.college.trim(),
        location: labForm.location.trim(),
        projectDirection: labForm.projectDirection.trim(),
        technologyStack: labForm.technologyStack.trim(),
        description: labForm.description.trim()
      })
      ElMessage.success('实训室档案已建立，请到详情页设置招生名额')
      labDialogVisible.value = false
      await load()
      router.push({ path: `/college/labs/${created.id}`, query: { tab: 'quotas' } })
    } catch { /* 请求层已提示保存失败原因（如编号重复） */ }
    finally { labSubmitting.value = false }
  })
}

/* ---------------- 组长账号 ---------------- */
const leaderDialog = reactive({
  visible: false,
  mode: 'create' as 'create' | 'edit',
  userId: null as number | null
})
const leaderSubmitting = ref(false)
const leaderFormRef = ref<FormInstance>()
const leaderForm = reactive({
  realName: '',
  employeeNumber: '',
  laboratoryId: null as number | null,
  phone: '',
  password: ''
})
const leaderRules: FormRules = {
  realName: [{ required: true, message: '请输入组长姓名', trigger: 'blur' }],
  employeeNumber: [{ required: true, message: '请输入工号（登录账号）', trigger: 'blur' }],
  laboratoryId: [{ required: true, message: '请选择所属实训室', trigger: 'change' }]
}

function resetLeaderForm(lab: LabView | null, leader: UserAccount | null) {
  leaderForm.realName = leader?.realName ?? ''
  leaderForm.employeeNumber = leader?.username ?? ''
  leaderForm.laboratoryId = leader?.laboratoryId ?? lab?.id ?? null
  leaderForm.phone = leader?.phone ?? ''
  leaderForm.password = ''
}

function openLeaderCreate(lab: LabView) {
  leaderDialog.mode = 'create'
  leaderDialog.userId = null
  resetLeaderForm(lab, null)
  leaderDialog.visible = true
}

function openLeaderEdit(lab: LabView) {
  const leader = leaderOf(lab)
  if (!leader) return openLeaderCreate(lab)
  leaderDialog.mode = 'edit'
  leaderDialog.userId = leader.id
  resetLeaderForm(lab, leader)
  leaderDialog.visible = true
}

async function submitLeader() {
  if (!leaderFormRef.value) return
  await leaderFormRef.value.validate(async (valid) => {
    if (!valid) return
    if (leaderForm.laboratoryId == null) return
    leaderSubmitting.value = true
    try {
      const employeeNumber = leaderForm.employeeNumber.trim()
      if (leaderDialog.mode === 'create') {
        await collegeApi.createUser({
          username: employeeNumber,
          employeeNumber,
          realName: leaderForm.realName.trim(),
          phone: leaderForm.phone.trim() || null,
          password: leaderForm.password.trim() || undefined,
          role: LEADER_ROLE,
          laboratoryId: leaderForm.laboratoryId,
          status: 'ACTIVE'
        })
        ElMessage.success('组长账号已创建并绑定实训室')
      } else if (leaderDialog.userId != null) {
        await collegeApi.updateUser(leaderDialog.userId, {
          username: employeeNumber,
          employeeNumber,
          realName: leaderForm.realName.trim(),
          phone: leaderForm.phone.trim() || null,
          role: LEADER_ROLE,
          laboratoryId: leaderForm.laboratoryId
        })
        ElMessage.success('组长资料已保存')
      }
      leaderDialog.visible = false
      await load()
    } catch { /* 请求层已提示保存失败原因（如组长唯一性冲突） */ }
    finally { leaderSubmitting.value = false }
  })
}

async function resetLeaderPassword(leader: UserAccount) {
  try {
    await ElMessageBox.confirm(
      `确认重置「${leader.realName}（${leader.username}）」的登录密码？重置后该账号当前登录状态立即失效，需使用系统初始密码重新登录。`,
      '重置登录密码',
      { type: 'warning', confirmButtonText: '确认重置', cancelButtonText: '取消' }
    )
  } catch { return }
  try {
    await collegeApi.resetPassword(leader.id)
    ElMessage.success('密码已重置，请通知本人使用初始密码登录并修改')
  } catch { /* 请求层已提示失败原因 */ }
}

async function toggleLeaderStatus(leader: UserAccount) {
  const disabling = leader.status === 'ACTIVE'
  try {
    await ElMessageBox.confirm(
      disabling
        ? `停用「${leader.realName}」后，该账号立即无法登录，并自动解除其实训室组长绑定；历史业务记录保留。启用后可重新绑定。`
        : `启用「${leader.realName}」后，该账号恢复登录；若其所属实训室已有其他启用组长，需先停用对方。`,
      disabling ? '停用组长账号' : '启用组长账号',
      { type: 'warning', confirmButtonText: disabling ? '确认停用' : '确认启用', cancelButtonText: '取消' }
    )
  } catch { return }
  try {
    await collegeApi.setUserStatus(leader.id, disabling ? 'INACTIVE' : 'ACTIVE')
    ElMessage.success(disabling ? '组长账号已停用' : '组长账号已启用')
    await load()
  } catch { /* 请求层已提示失败原因 */ }
}

async function removeLeader(leader: UserAccount) {
  try {
    await ElMessageBox.confirm(
      `确认删除「${leader.realName}（${leader.username}）」的组长账号？删除为软删除：历史面试、录取与操作日志全部保留，账号将解除实训室绑定且无法再次登录。`,
      '删除组长账号',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消', confirmButtonClass: 'el-button--danger' }
    )
  } catch { return }
  try {
    await collegeApi.disableUser(leader.id)
    ElMessage.success('组长账号已删除')
    await load()
  } catch { /* 请求层已提示失败原因 */ }
}

function onLeaderCommand(command: string, lab: LabView) {
  const leader = leaderOf(lab)
  if (!leader) return openLeaderCreate(lab)
  if (command === 'edit') return openLeaderEdit(lab)
  if (command === 'reset') return resetLeaderPassword(leader)
  if (command === 'toggle') return toggleLeaderStatus(leader)
  if (command === 'delete') return removeLeader(leader)
}

onMounted(load)
</script>

<style scoped>
.lab-admin { display: grid; gap: 16px; }
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 14px; }
.toolbar .search { width: min(100%, 300px); }
.leader-name { font-weight: 600; color: var(--lm-text); }
.leader-no { margin-left: 8px; color: var(--lm-text-secondary); font-size: 12px; }
.muted { color: var(--lm-text-secondary); }
.dialog-hint { margin: 4px 0 0 110px; font-size: 12px; line-height: 1.6; color: var(--lm-text-secondary); }
.full { width: 100%; }
.dropdown-arrow { margin-left: 4px; font-size: 12px; }
</style>
