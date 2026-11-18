<template>
  <el-container direction="vertical" class="layout workspace-theme" :data-role="auth.currentRole">
    <GlassAmbient />

    <!-- ========= 顶部栏：悬浮玻璃胶囊 ========= -->
    <el-header class="topbar">
      <span class="lg-lens" aria-hidden="true"></span>
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

    <!-- ========= 横向菜单条：第二块玻璃岛 ========= -->
    <nav class="navbar" aria-label="工作台导航">
      <span class="lg-lens" aria-hidden="true"></span>
      <div class="navbar-scroll">
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
      </div>
    </nav>

    <!-- ========= 内容区 ========= -->
    <el-main class="main">
      <div ref="workspaceContent" class="workspace-content">
        <WorkspaceRibbon :role="auth.currentRole" />
        <router-view />
        <WorkspaceBackdrop />
      </div>
    </el-main>

    <AssistantDock />
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
import AssistantDock from '@/components/AssistantDock.vue'
import GlassAmbient from '@/components/GlassAmbient.vue'
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

/* ---------- 顶部玻璃胶囊 ----------
   overflow 必须保持 visible：菜单展开时突变 overflow 会让合成器重建离屏纹理，整条顶栏白闪 */
.topbar {
  position: relative;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px 18px;
  min-height: 64px;
  height: auto;
  margin: 14px var(--workspace-gutter) 0;
  padding: 8px 16px 8px 12px;
  border-radius: 999px;
  overflow: visible;
  background-color: rgba(255, 255, 255, 0.3);
  background-image:
    radial-gradient(120% 200% at 3% -60%, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0) 62%),
    linear-gradient(148deg, rgba(255, 255, 255, 0.44) 0%, rgba(255, 255, 255, 0.1) 52%, rgba(255, 255, 255, 0.3) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.96),
    inset 1px 0 0 rgba(255, 255, 255, 0.5),
    inset -1px 0 0 rgba(255, 255, 255, 0.5),
    inset 0 -1px 0 rgba(255, 255, 255, 0.7),
    0 1px 2px rgba(58, 41, 28, 0.04),
    var(--lg-shadow);
  transition: box-shadow 0.45s var(--lg-ease);
}
.topbar :deep(.lg-lens) { border-radius: 999px; }

.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 5px 10px 5px 5px;
  margin-inline-start: -2px;
  border-radius: 999px;
  transition: background-color 0.3s var(--lg-ease);
}
.brand-text { display: grid; gap: 3px; white-space: nowrap; }
.brand-name { font-size: 13px; font-weight: 700; letter-spacing: -0.01em; color: var(--workspace-ink); }
.brand-sub { font-size: 10.5px; letter-spacing: 0.06em; color: var(--workspace-accent); }

/* 阶段胶囊：内嵌一层更薄的玻璃，形成「玻璃上的玻璃」层次 */
.stage-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 34px;
  padding: 4px 13px;
  border-radius: 999px;
  background-color: rgba(255, 255, 255, 0.4);
  background-image: linear-gradient(150deg, rgba(255, 255, 255, 0.6), color-mix(in srgb, var(--workspace-tint) 70%, transparent));
  font-size: 13px;
  color: var(--workspace-ink);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.95),
    inset 0 -1px 0 rgba(255, 255, 255, 0.6),
    0 1px 3px rgba(58, 41, 28, 0.06);
}
.stage-pill-icon { color: var(--workspace-accent); flex: none; }
.stage-pill-label { color: var(--workspace-muted); font-size: 11px; white-space: nowrap; }
.stage-pill-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 640; }
.stage-pill-countdown { color: var(--workspace-accent); font: 12px var(--workspace-mono); white-space: nowrap; }
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

/* ---------- 导航玻璃岛 ---------- */
.navbar {
  position: relative;
  z-index: 4;
  flex: none;
  min-width: 0;
  margin: 10px var(--workspace-gutter) 0;
  padding: 4px 8px;
  border-radius: 999px;
  overflow: visible;
  background-color: rgba(255, 255, 255, 0.26);
  background-image:
    radial-gradient(100% 220% at 0% -80%, rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0) 60%),
    linear-gradient(148deg, rgba(255, 255, 255, 0.38), rgba(255, 255, 255, 0.08));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.92),
    inset 0 -1px 0 rgba(255, 255, 255, 0.62),
    0 1px 2px rgba(58, 41, 28, 0.03),
    var(--lg-shadow);
}
.navbar :deep(.lg-lens) { border-radius: 999px; }
.navbar-scroll {
  display: flex;
  overflow-x: auto;
  scrollbar-width: none;
}
.navbar-scroll::-webkit-scrollbar { height: 0; }

.nav-menu {
  --el-menu-horizontal-height: 44px;
  --el-menu-bg-color: transparent;
  --el-menu-text-color: var(--workspace-muted);
  --el-menu-active-color: var(--workspace-accent);
  --el-menu-hover-bg-color: rgba(255, 255, 255, 0.5);
  width: max-content;
  align-items: center;
  gap: 3px;
  border: 0;
  background: transparent;
}
.nav-menu > :deep(.el-menu-item),
.nav-menu > :deep(.el-sub-menu > .el-sub-menu__title) {
  height: 36px;
  line-height: 36px;
  padding: 0 clamp(10px, 1vw, 15px);
  border: 0;
  border-radius: 999px;
  color: var(--workspace-muted);
  font-weight: 550;
  white-space: nowrap;
  transition: color 0.22s var(--lg-ease), background-color 0.3s var(--lg-ease), box-shadow 0.3s var(--lg-ease);
}
.nav-menu > :deep(.el-menu-item.is-active),
.nav-menu > :deep(.el-sub-menu.is-active > .el-sub-menu__title) {
  color: var(--workspace-accent) !important;
  background: rgba(255, 255, 255, 0.86);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.98),
    0 1px 3px rgba(58, 41, 28, 0.1),
    0 6px 16px -10px rgba(58, 41, 28, 0.3);
  font-weight: 700;
  border: 0;
}
.nav-menu > :deep(.el-menu-item:hover),
.nav-menu > :deep(.el-sub-menu > .el-sub-menu__title:hover) {
  color: var(--workspace-ink);
  background: rgba(255, 255, 255, 0.46);
}
.nav-menu > :deep(.el-menu-item:active),
.nav-menu > :deep(.el-sub-menu:active > .el-sub-menu__title) { box-shadow: inset 0 2px 4px rgba(58, 41, 28, 0.08); }
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
  .topbar {
    flex-wrap: wrap;
    /* 换行后胶囊会变成大水滴，改成大圆角更稳 */
    border-radius: 26px;
    margin-top: 10px;
    padding: 10px 12px;
  }
  .stage-pill { order: 3; flex: 1 0 100%; border-radius: 18px; }
  .stage-pill-countdown { margin-inline-start: auto; }
  .user-info { display: none; }
  .brand { padding-inline-end: 0; }
  .navbar { border-radius: 22px; padding: 3px 6px; }
  .nav-menu { --el-menu-horizontal-height: 42px; }
  .main { padding-top: 14px; }
  .main :deep(.el-card__body) { padding: 12px; }
}
@media (max-width: 390px) {
  .stage-pill-countdown { display: none; }
  .role-select { width: 104px; }
}
</style>
