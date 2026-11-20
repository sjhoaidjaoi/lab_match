<template>
  <div v-loading="loading" class="teacher-settings">
    <el-alert v-if="failed" type="error" title="教师资料读取失败" :closable="false">
      <el-button link @click="load">重试</el-button>
    </el-alert>
    <el-card shadow="never">
      <template #header>
        <div class="card-heading"><strong>本室教师账号</strong><el-button type="primary" @click="editAccount()">新增教师</el-button></div>
      </template>
      <el-table :data="staff" empty-text="暂无教师账号">
        <el-table-column prop="realName" label="姓名" min-width="100" />
        <el-table-column prop="username" label="工号 / 账号" min-width="120" />
        <el-table-column prop="phone" label="联系电话" min-width="130" />
        <el-table-column label="状态" min-width="110">
          <template #default="{ row }">{{ row.role === 'LAB_LEADER' ? '组长兼教师' : row.status === 'ACTIVE' ? '启用' : '停用' }}</template>
        </el-table-column>
        <el-table-column label="操作" min-width="330">
          <template #default="{ row }">
            <el-button v-if="row.role === 'LAB_TEACHER'" link type="primary" @click="editAccount(row)">编辑账号</el-button>
            <el-button v-if="row.role === 'LAB_TEACHER'" link @click="resetPassword(row)">重置密码</el-button>
            <el-button v-if="row.status === 'ACTIVE'" link type="primary" @click="editMentor(mentors.find(item => item.userId === row.id), row)">导师资料</el-button>
            <el-button
              v-if="row.role === 'LAB_TEACHER'"
              link
              :type="row.status === 'ACTIVE' ? 'warning' : 'success'"
              @click="toggleStatus(row)"
            >{{ row.status === 'ACTIVE' ? '停用' : '启用' }}</el-button>
            <el-button v-if="row.role === 'LAB_TEACHER'" link type="danger" @click="deleteAccount(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    <el-card shadow="never">
      <template #header>
        <div class="card-heading"><strong>导师资料与名额 · 本室总名额 {{ quota }}</strong><el-button @click="editMentor()">新增导师资料</el-button></div>
      </template>
      <p class="teacher-hint">关联本室账号并启用导师资料后，学生填报志愿时即可选择该导师。</p>
      <el-table :data="mentors" empty-text="暂无导师资料">
        <el-table-column prop="name" label="导师" min-width="100" />
        <el-table-column prop="title" label="职称" min-width="105" />
        <el-table-column prop="direction" label="方向" min-width="120" />
        <el-table-column label="已绑定账号" min-width="120">
          <template #default="{ row }">{{ staff.find(item => item.id === row.userId)?.username || '未绑定' }}</template>
        </el-table-column>
        <el-table-column label="招生名额" min-width="95">
          <template #default="{ row }">{{ row.recruitmentQuota ?? '本室统筹' }}</template>
        </el-table-column>
        <el-table-column label="展示状态" min-width="100">
          <template #default="{ row }">{{ row.status === 'INACTIVE' ? '停用' : '启用' }}</template>
        </el-table-column>
        <el-table-column label="操作" min-width="118">
          <template #default="{ row }">
            <el-button link type="primary" @click="editMentor(row)">编辑</el-button>
            <el-button link type="danger" @click="removeMentor(row)">移除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="accountVisible" :title="editingAccount ? '编辑教师账号' : '新增教师账号'" width="min(520px, 94vw)" :close-on-click-modal="!saving">
      <el-form label-position="top" :disabled="saving" @submit.prevent="saveAccount">
        <el-form-item label="工号" required><el-input v-model="account.employeeNumber" maxlength="64" required /></el-form-item>
        <el-form-item label="姓名" required><el-input v-model="account.realName" maxlength="64" required /></el-form-item>
        <el-form-item label="联系电话"><el-input v-model="account.phone" maxlength="20" /></el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="account.status"><el-radio value="ACTIVE">启用</el-radio><el-radio value="INACTIVE">停用</el-radio></el-radio-group>
        </el-form-item>
        <p v-if="!editingAccount" class="muted">工号用于登录，初始密码为 123456，首次登录须修改密码。</p>
        <el-button type="primary" native-type="submit" :loading="saving">保存账号</el-button>
      </el-form>
    </el-dialog>
    <el-dialog v-model="mentorVisible" :title="editingMentor ? '编辑导师资料' : '新增导师资料'" width="min(560px, 94vw)" :close-on-click-modal="!saving">
      <el-form label-position="top" :disabled="saving" @submit.prevent="saveMentor">
        <el-form-item label="关联本室账号">
          <el-select v-model="mentor.userId" clearable placeholder="选择本室教师或组长" @change="fillMentorName">
            <el-option v-for="user in staff" :key="user.id" :value="user.id"
              :disabled="user.status !== 'ACTIVE' && mentor.userId !== user.id"
              :label="user.realName + ' · ' + user.username" />
          </el-select>
        </el-form-item>
        <el-form-item label="姓名" required><el-input v-model="mentor.name" required /></el-form-item>
        <el-form-item label="职称 / 职务"><el-input v-model="mentor.title" /></el-form-item>
        <el-form-item label="研究方向"><el-input v-model="mentor.direction" /></el-form-item>
        <el-form-item label="简介"><el-input v-model="mentor.intro" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="招生名额"><el-input-number v-model="mentor.recruitmentQuota" :min="0" :max="quota" step-strict placeholder="本室统筹" /></el-form-item>
        <el-form-item label="展示状态">
          <el-radio-group v-model="mentor.status"><el-radio value="ACTIVE">启用</el-radio><el-radio value="INACTIVE">停用</el-radio></el-radio-group>
        </el-form-item>
        <el-button type="primary" native-type="submit" :loading="saving">保存导师资料</el-button>
      </el-form>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { labApi, type MentorProfile, type TeacherAccountProfile } from '@/api/lab'
import type { LabTeacher } from '@/api/student'
import type { UserAccount } from '@/types'

const props = defineProps<{ labId: number; quota: number }>()
const emit = defineEmits<{ updated: [] }>()
const staff = ref<UserAccount[]>([])
const mentors = ref<LabTeacher[]>([])
const loading = ref(false)
const failed = ref(false)
const saving = ref(false)
const editingAccount = ref<UserAccount>()
const editingMentor = ref<LabTeacher>()
const accountVisible = ref(false)
const mentorVisible = ref(false)
const account = reactive<TeacherAccountProfile>({ employeeNumber: '', realName: '', phone: '', status: 'ACTIVE' })
const mentor = reactive<MentorProfile>({ name: '', title: '', direction: '', intro: '', status: 'ACTIVE', userId: null, recruitmentQuota: null })

async function load() {
  loading.value = true
  failed.value = false
  try {
    const [accounts, profiles] = await Promise.all([labApi.staff(props.labId), labApi.mentors(props.labId)])
    staff.value = accounts
    mentors.value = profiles
  } catch { failed.value = true }
  finally { loading.value = false }
}

function editAccount(row?: UserAccount) {
  editingAccount.value = row
  Object.assign(account, { employeeNumber: row?.username ?? '', realName: row?.realName ?? '', phone: row?.phone ?? '', status: row?.status ?? 'ACTIVE' })
  accountVisible.value = true
}

function editMentor(row?: LabTeacher, user?: UserAccount) {
  editingMentor.value = row
  Object.assign(mentor, { name: row?.name ?? user?.realName ?? '', title: row?.title ?? '', direction: row?.direction ?? '',
    intro: row?.intro ?? '', status: row?.status ?? 'ACTIVE', userId: row?.userId ?? user?.id ?? null,
    recruitmentQuota: row?.recruitmentQuota ?? null, sortNo: row?.sortNo ?? mentors.value.length + 1 })
  mentorVisible.value = true
}

function fillMentorName() {
  if (!mentor.name) mentor.name = staff.value.find(user => user.id === mentor.userId)?.realName ?? ''
}

async function act(action: () => Promise<unknown>, done?: () => void) {
  if (saving.value) return
  saving.value = true
  try {
    await action()
    done?.()
    ElMessage.success('操作已保存')
    await load()
    emit('updated')
  } catch { /* 请求层显示权限或校验错误。 */ }
  finally { saving.value = false }
}

function saveAccount() {
  if (!account.employeeNumber.trim() || !account.realName.trim()) return ElMessage.warning('请填写工号与姓名')
  const row = editingAccount.value
  void act(() => row ? labApi.updateStaff(props.labId, row.id, { ...account }) : labApi.createStaff(props.labId, { ...account }),
    () => { accountVisible.value = false })
}

function saveMentor() {
  if (!mentor.name.trim()) return ElMessage.warning('请输入导师姓名')
  const payload = { ...mentor, userId: mentor.userId || null, recruitmentQuota: mentor.recruitmentQuota ?? null }
  const row = editingMentor.value
  void act(() => row ? labApi.updateMentor(props.labId, row.id, payload) : labApi.createMentor(props.labId, payload),
    () => { mentorVisible.value = false })
}

async function resetPassword(row: UserAccount) {
  const accepted = await ElMessageBox.confirm(`将 ${row.realName} 的密码重置为初始密码？`, '重置密码', { type: 'warning' }).then(() => true, () => false)
  if (accepted) await act(() => labApi.resetStaffPassword(props.labId, row.id))
}

/** 停用后该教师立即无法登录，历史业务记录保留 */
async function toggleStatus(row: UserAccount) {
  const disabling = row.status === 'ACTIVE'
  const accepted = await ElMessageBox.confirm(
    disabling
      ? `停用「${row.realName}」后该账号立即无法登录，当前登录状态失效；历史带教、面试与录取记录全部保留，可随时重新启用。`
      : `启用「${row.realName}」后该账号恢复登录权限。`,
    disabling ? '停用教师账号' : '启用教师账号',
    { type: 'warning', confirmButtonText: disabling ? '确认停用' : '确认启用' }
  ).then(() => true, () => false)
  if (accepted) await act(() => labApi.setStaffStatus(props.labId, row.id, disabling ? 'INACTIVE' : 'ACTIVE'))
}

/** 软删除：账号失效并解除档案绑定，历史记录不删除 */
async function deleteAccount(row: UserAccount) {
  const accepted = await ElMessageBox.confirm(
    `确认删除「${row.realName}（${row.username}）」的教师账号？删除为软删除：历史面试、录取与操作日志全部保留，账号将无法再次登录。`,
    '删除教师账号',
    { type: 'warning', confirmButtonText: '确认删除' }
  ).then(() => true, () => false)
  if (accepted) await act(() => labApi.deleteStaff(props.labId, row.id))
}

async function removeMentor(row: LabTeacher) {
  const accepted = await ElMessageBox.confirm(`移除导师资料「${row.name}」？`, '移除导师', { type: 'warning' }).then(() => true, () => false)
  if (accepted) await act(() => labApi.removeMentor(props.labId, row.id))
}

watch(() => props.labId, load, { immediate: true })
</script>

<style scoped>
.teacher-settings { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; }
.card-heading { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; }
.teacher-hint { color: var(--workspace-muted); margin: 0 0 12px; }
</style>
