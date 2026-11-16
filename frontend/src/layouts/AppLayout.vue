<template>
  <el-container direction="vertical" class="layout workspace-theme" :data-role="auth.currentRole">
    <!-- ========= 顶部栏 ========= -->
    <el-header class="topbar">
      <RouterLink class="brand workspace-account" :to="ROLE_HOME[auth.currentRole] || '/'">
        <img class="workspace-logo" :src="schoolLogo" alt="河北师范大学软件学院" />
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
    </el-header>

    <!-- ========= 横向菜单条 ========= -->
    <nav class="navbar" aria-label="工作台导航">
      <el-menu :default-active="activeMenuPath" router mode="horizontal" menu-trigger="click"
        :ellipsis="false" class="nav-menu">
        <template v-for="item in currentMenus" :key="item.path || item.title">
          <el-sub-menu v-if="item.children && item.children.length" :index="item.title" popper-class="workspace-popover">
            <template #title>
              <el-icon><component :is="item.icon" /></el-icon>
              <span>{{ item.title }}</span>
            </template>
            <el-menu-item v-for="child in item.children" :key="child.path" :index="child.path">
              <el-icon><component :is="child.icon" /></el-icon>
              <span>{{ child.title }}</span>
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item v-else :index="item.path">
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.title }}</span>
          </el-menu-item>
        </template>
      </el-menu>
    </nav>

    <!-- ========= 内容区 ========= -->
    <el-main class="main">
      <div ref="workspaceContent" class="workspace-content">
        <WorkspaceRibbon :role="auth.currentRole" />
        <router-view />
        <WorkspaceBackdrop />
      </div>
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Clock } from '@element-plus/icons-vue'
import { menus } from '@/router/menus'
import { ROLE_HOME } from '@/config/stages'
import { useAuthStore } from '@/stores/auth'
import { useCycleStore } from '@/stores/cycle'
import WorkspaceRibbon from '@/components/WorkspaceRibbon.vue'
import WorkspaceBackdrop from '@/components/WorkspaceBackdrop.vue'
import '@/styles/workspace.css'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const cycleStore = useCycleStore()
const schoolLogo = `${import.meta.env.BASE_URL}brand/hebei-normal-software.jpg`

const currentMenus = computed(() => menus[auth.currentRole] ?? [])
const activeMenuPath = computed(() => {
  const items = currentMenus.value.flatMap(item => item.children || [item])
  return items.find(item => route.path === item.path || route.path.startsWith(item.path + '/'))?.path ?? ''
})
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
.layout { height: 100%; min-width: 0; }
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px 18px;
  min-height: 62px;
  height: auto;
  padding: 8px var(--workspace-gutter);
  border-bottom: 1px solid var(--workspace-border);
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 5px;
  margin-inline-start: -5px;
  border-radius: 8px;
}
.brand-text { display: grid; gap: 3px; white-space: nowrap; }
.brand-name { font-size: 13px; font-weight: 680; color: var(--workspace-ink); }
.brand-sub { font-size: 11px; color: var(--workspace-accent); }
.stage-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 34px;
  padding: 4px 12px;
  background: var(--workspace-tint);
  border: 1px solid var(--workspace-border);
  border-radius: 9px;
  font-size: 13px;
  color: var(--workspace-ink);
}
.stage-pill-icon { color: var(--workspace-accent); flex: none; }
.stage-pill-label { color: var(--workspace-muted); font-size: 11px; white-space: nowrap; }
.stage-pill-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
.stage-pill-countdown { color: var(--workspace-accent); font: 12px var(--workspace-mono); white-space: nowrap; }
.topbar-right { display: flex; align-items: center; gap: 10px; flex: none; }
.role-select { width: 118px; }
.user {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 3px 8px 3px 4px;
  border: 1px solid var(--workspace-border);
  border-radius: 9px;
  background: var(--workspace-paper);
  color: var(--workspace-ink);
  cursor: pointer;
  font: inherit;
  text-align: start;
}
.brand:hover, .user:hover, .user[aria-expanded="true"] { background: var(--workspace-tint); }
.user-avatar { background: var(--workspace-tint); color: var(--workspace-accent); font-weight: 650; }
.user-info { display: grid; line-height: 1.3; }
.user-name { max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 650; }
.user-role { font-size: 10px; color: var(--workspace-muted); }
.user-caret { color: var(--workspace-accent); }

.navbar {
  flex: none;
  min-width: 0;
  padding: 0 var(--workspace-gutter);
  overflow-x: auto;
  scrollbar-width: thin;
  background: var(--workspace-paper);
  border-bottom: 1px solid var(--workspace-border);
}
.nav-menu {
  --el-menu-horizontal-height: 52px;
  --el-menu-bg-color: transparent;
  --el-menu-text-color: var(--workspace-ink);
  --el-menu-active-color: var(--workspace-accent);
  --el-menu-hover-bg-color: var(--workspace-tint);
  width: max-content;
  align-items: center;
  gap: 5px;
  border: 0;
}
.nav-menu > :deep(.el-menu-item),
.nav-menu > :deep(.el-sub-menu > .el-sub-menu__title) {
  height: 37px;
  line-height: 37px;
  padding: 0 clamp(9px, 1vw, 15px);
  border: 0;
  border-radius: 7px;
  color: var(--workspace-ink);
  white-space: nowrap;
}
.nav-menu > :deep(.el-menu-item.is-active),
.nav-menu > :deep(.el-sub-menu.is-active > .el-sub-menu__title) {
  color: var(--workspace-accent) !important;
  background: var(--workspace-tint);
  box-shadow: inset 0 -2px var(--workspace-accent);
  font-weight: 650;
  border: 0;
}
.nav-menu > :deep(.el-menu-item:hover),
.nav-menu > :deep(.el-sub-menu > .el-sub-menu__title:hover) {
  color: var(--workspace-accent);
  background: var(--workspace-tint);
}
.nav-menu > :deep(.el-menu-item:active),
.nav-menu > :deep(.el-sub-menu:active > .el-sub-menu__title) { box-shadow: inset 0 -2px var(--workspace-accent); }
.nav-menu :deep(.el-icon) { margin-inline-end: 5px; font-size: 14px; }
.nav-menu :deep(.el-sub-menu__icon-arrow) { position: static; margin: 0 0 0 6px; }

.main { min-width: 0; min-height: 0; padding: clamp(14px, 1.7vw, 25px) var(--workspace-gutter) 20px; overflow: auto; }
.workspace-content {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 1816px;
  min-width: 0;
  min-height: 100%;
  margin-inline: auto;
}
@media (max-width: 1100px) {
  .brand-text { display: none; }
}
@media (max-width: 720px) {
  .topbar { flex-wrap: wrap; }
  .stage-pill { order: 3; flex: 1 0 100%; }
  .stage-pill-countdown { margin-inline-start: auto; }
  .user-info { display: none; }
  .brand { padding-inline-end: 0; }
  .main :deep(.el-card__body) { padding: 12px; }
}
@media (max-width: 390px) {
  .stage-pill-countdown { display: none; }
  .role-select { width: 104px; }
}
</style>
