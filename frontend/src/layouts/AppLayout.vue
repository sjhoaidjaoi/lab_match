<template>
  <el-container direction="vertical" class="layout workspace-theme" :data-role="auth.currentRole">

    <WorkspaceNav :role="auth.currentRole">
      <RouterLink class="brand workspace-account" :to="ROLE_HOME[auth.currentRole] || '/'">
        <SchoolBrand class="workspace-logo" />
        <div class="brand-text">
          <span class="brand-name">实训室进组选拔平台</span>
          <span class="brand-sub">{{ auth.roleName }} · LAB MATCH</span>
        </div>
      </RouterLink>

      <div class="stage-pill">
        <el-icon class="stage-pill-icon"><Clock /></el-icon>
        <span class="stage-pill-label">当前阶段</span>
        <span class="stage-pill-name">{{ cycleStore.currentStage?.stageName || (cycleStore.loading ? '读取中' : '暂无阶段') }}</span>
        <el-tag v-if="cycleStore.currentStage" size="small" effect="light" :type="stageTagType">{{ stageStatusLabel }}</el-tag>
        <span v-if="stageCountdown" class="stage-pill-countdown">{{ stageCountdown }}</span>
      </div>

      <div class="topbar-right">
        <el-select
          v-if="auth.hasMultipleRoles"
          :model-value="auth.currentRole"
          size="small"
          class="role-select"
          aria-label="切换工作台身份"
          :disabled="switchingRole"
          @change="onRoleChange"
        >
          <el-option
            v-for="role in auth.roles"
            :key="role.roleCode"
            :label="role.roleName"
            :value="role.roleCode"
          />
        </el-select>
        <el-dropdown trigger="click" popper-class="workspace-popover" @command="onCommand">
          <button type="button" class="user workspace-account" aria-label="账号菜单">
            <el-avatar :size="28" class="user-avatar">
              {{ (auth.user?.realName || auth.user?.username || '?').slice(0, 1) }}
            </el-avatar>
            <div class="user-info">
              <span class="user-name">{{ auth.user?.realName || auth.user?.username }}</span>
              <span class="user-role">{{ auth.roleName }}</span>
            </div>
            <el-icon class="user-caret"><ArrowDown /></el-icon>
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item disabled>{{ auth.roleName }}</el-dropdown-item>
              <el-dropdown-item divided command="profile">个人信息</el-dropdown-item>
              <el-dropdown-item command="announcements">系统公告</el-dropdown-item>
              <el-dropdown-item command="help">帮助与说明</el-dropdown-item>
              <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </WorkspaceNav>

    <el-main class="main">
      <div ref="workspaceContent" class="workspace-content">
        <nav v-if="collegeModule" class="module-switch" :aria-label="collegeModule.title">
          <strong>{{ collegeModule.title }}</strong>
          <RouterLink v-for="link in collegeModule.links" :key="link.path" :to="link.path"
            :aria-current="route.path === link.path || route.path.startsWith(link.path + '/') ? 'location' : undefined">
            {{ link.title }}
          </RouterLink>
        </nav>
        <router-view class="portal-sheet" />
      </div>
    </el-main>

    <AssistantDock />
  </el-container>
</template>

<script setup lang="ts">
import SchoolBrand from '@/components/SchoolBrand.vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Clock } from '@element-plus/icons-vue'
import { collegeModuleFor } from '@/router/collegeModules'
import { ROLE_HOME } from '@/config/stages'
import { useAuthStore } from '@/stores/auth'
import { useCycleStore } from '@/stores/cycle'
import WorkspaceNav from '@/components/WorkspaceNav.vue'
import AssistantDock from '@/components/AssistantDock.vue'
import '@/styles/workspace.css'
/* 质感层必须排在 workspace.css 之后：两者有同特异性选择器，靠顺序决胜 */
import '@/styles/premium.css'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const cycleStore = useCycleStore()
const collegeModule = computed(() => auth.currentRole === 'COLLEGE_ADMIN' ? collegeModuleFor(route.path) : undefined)

const workspaceContent = ref<HTMLElement>()
const switchingRole = ref(false)

watch(() => route.path, () => {
  workspaceContent.value?.parentElement?.scrollTo({ top: 0 })
})

// 阶段状态
const now = ref(Date.now())
let timer: number | undefined
const STATUS_MAP: Record<string, { label: string; tag: 'success' | 'info' | 'warning' }> = {
  NOT_STARTED: { label: '未开始', tag: 'warning' },
  IN_PROGRESS: { label: '进行中', tag: 'success' },
  COMPLETED: { label: '已结束', tag: 'info' },
  PAUSED: { label: '已暂停', tag: 'warning' }
}
const stageStatusLabel = computed(() => STATUS_MAP[cycleStore.currentStage?.stageStatus || 'NOT_STARTED']?.label || '—')
const stageTagType = computed(() => STATUS_MAP[cycleStore.currentStage?.stageStatus || 'NOT_STARTED']?.tag || 'info')
const stageCountdown = computed(() => {
  const end = cycleStore.currentStage?.endTime ? new Date(cycleStore.currentStage.endTime).getTime() : 0
  if (!end) return ''
  const diff = end - now.value
  if (diff <= 0) return '已结束'
  const total = Math.floor(diff / 1000)
  const days = Math.floor(total / 86400)
  const h = Math.floor((total % 86400) / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const hms = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return days > 0 ? `剩余 ${days}天 ${hms}` : `剩余 ${hms}`
})

function onCommand(command: string) {
  if (command === 'logout') {
    auth.logout(true)
    router.replace('/login')
    return
  }
  if (command === 'profile') {
    if (auth.currentRole === 'STUDENT') router.push('/student/profile')
    else router.push('/profile')
    return
  }
  if (command === 'announcements') {
    if (auth.currentRole === 'STUDENT') router.push('/student/messages')
    else router.push('/announcements')
    return
  }
  if (command === 'help') {
    const prefix: Record<string, string> = { LAB_TEACHER: '/teacher', LAB_LEADER: '/leader', COLLEGE_ADMIN: '/college' }
    router.push(`${prefix[auth.currentRole] || ''}/help`)
  }
}

async function onRoleChange(value: string | number | boolean | undefined) {
  const roleCode = String(value ?? '')
  if (!roleCode || roleCode === auth.currentRole || switchingRole.value) return
  switchingRole.value = true
  try {
    await auth.switchRole(roleCode)
    await router.replace(ROLE_HOME[roleCode] || '/')
    await cycleStore.load(true)
  } catch {
    // 请求层呈现错误，保留当前页面可继续操作。
  } finally {
    switchingRole.value = false
  }
}

onMounted(() => {
  auth.refresh().catch(() => undefined)
  cycleStore.load().catch(() => undefined)
  timer = window.setInterval(() => { now.value = Date.now() }, 1000)
})
onUnmounted(() => { if (timer) window.clearInterval(timer) })
</script>

<style scoped>
.module-switch { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 16px; padding: 8px var(--sheet-inset); background: white; border: 1px solid var(--portal-line); border-bottom: 0; border-radius: 18px 18px 0 0; }
.module-switch strong { font-size: 14px; margin-right: 4px; }
.module-switch a { color: var(--workspace-muted); padding: 6px 0; font-size: 14px; }
.module-switch a:hover, .module-switch a[aria-current] { color: var(--lm-primary-dark); }
.module-switch a[aria-current] { text-decoration: underline; text-underline-offset: 5px; font-weight: 650; }
.module-switch + :deep(.portal-sheet), .module-switch + :deep(.portal-sheet > .page-header) { border-top-left-radius: 0; border-top-right-radius: 0; }
.layout { height: 100%; min-width: 0; }

.brand {
  display: inline-flex;
  align-items: center;
  gap: 13px;
  min-width: 0;
  padding: 6px 12px 6px 6px;
  margin-inline-start: -4px;
  border-radius: 16px;
  transition: background-color 0.3s var(--lg-ease);
}
.brand-text { display: grid; gap: 4px; white-space: nowrap; }
.brand-name { font-size: 14px; font-weight: 750; letter-spacing: .01em; color: var(--workspace-ink); }
.brand-sub { font-size: 10px; font-weight: 600; letter-spacing: .14em; color: #a4551f; }

/* 阶段胶囊：白纸 + 发丝边，靠一枚橙色状态点提示「正在进行」 */
.stage-pill {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  min-height: 38px;
  padding: 5px 14px 5px 13px;
  border: 1px solid #ece2d4;
  border-radius: 999px;
  background: linear-gradient(180deg, #ffffff, #fdf8f1);
  font-size: 13px;
  color: var(--workspace-ink);
  box-shadow: 0 1px 2px rgba(66, 45, 28, .05), inset 0 1px 0 #fff;
}
.stage-pill-icon { color: var(--workspace-accent); flex: none; font-size: 14px; }
.stage-pill-label { color: #8b857c; font-size: 11px; letter-spacing: .06em; white-space: nowrap; }
.stage-pill-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 680; }
.stage-pill-countdown { padding-inline-start: 10px; border-inline-start: 1px solid #eee3d5; color: #b1591c; font: 600 12px var(--workspace-mono); white-space: nowrap; }
.topbar-right { display: flex; align-items: center; gap: 10px; flex: none; }
.role-select { width: 118px; }

.user {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 3px 10px 3px 4px;
  border: 0;
  border-radius: 999px;
  background-color: rgba(255, 255, 255, 0.42);
  background-image: linear-gradient(150deg, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0.08));
  color: var(--workspace-ink);
  cursor: pointer;
  font: inherit;
  text-align: start;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.95),
    inset 0 -1px 0 rgba(255, 255, 255, 0.6),
    0 1px 3px rgba(58, 41, 28, 0.05);
  transition: background-color 0.3s var(--lg-ease), box-shadow 0.34s var(--lg-ease);
}
.brand:hover { background: rgba(255, 255, 255, 0.45); }
.user:hover,
.user[aria-expanded="true"] {
  background-color: rgba(255, 255, 255, 0.66);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.98),
    inset 0 -1px 0 rgba(255, 255, 255, 0.7),
    0 6px 18px -10px rgba(58, 41, 28, 0.3);
}
.user-avatar {
  background: linear-gradient(150deg, #ffb98d, #f2701f);
  color: #fff;
  font-weight: 680;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
.user-info { display: grid; line-height: 1.3; }
.user-name { max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 660; }
.user-role { font-size: 10px; color: var(--workspace-muted); }
.user-caret { color: var(--workspace-accent); }

.main { min-width: 0; min-height: 0; padding: clamp(14px, 1.7vw, 25px) var(--workspace-gutter) 20px; overflow: auto; }
.workspace-content {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: none;
  min-width: 0;
  min-height: 100%;
  margin-inline: auto;
}
@media (max-width: 1100px) {
  .brand-text { display: none; }
}
@media (max-width: 720px) {
  .stage-pill { order: 3; flex: 1 0 100%; border-radius: 18px; }
  .stage-pill-countdown { margin-inline-start: auto; }
  .user-info { display: none; }
  .brand { padding-inline-end: 0; }
  .main { padding-top: 14px; }
  .main :deep(.el-card__body) { padding: 12px; }
}
@media (max-width: 390px) {
  .stage-pill-countdown { display: none; }
  .role-select { width: 104px; }
}
</style>
