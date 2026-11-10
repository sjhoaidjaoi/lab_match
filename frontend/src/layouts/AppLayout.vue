<template>
  <el-container class="layout">
    <!-- ========= 顶部栏 ========= -->
    <el-header class="topbar" height="56px">
      <div class="brand">
        <div class="brand-mark">LM</div>
        <div class="brand-text">
          <span class="brand-name">实训室进组选拔平台</span>
          <span class="brand-sub">Lab Match</span>
        </div>
      </div>

      <div class="stage-pill">
        <el-icon class="stage-pill-icon"><Clock /></el-icon>
        <span class="stage-pill-label">当前</span>
        <span class="stage-pill-name">{{ cycleStore.currentStage?.stageName || '加载中' }}</span>
        <el-tag size="small" effect="dark" :type="stageTagType">{{ stageStatusLabel }}</el-tag>
        <span v-if="stageCountdown" class="stage-pill-countdown">{{ stageCountdown }}</span>
      </div>

      <div class="topbar-right">
        <el-select
          v-if="auth.hasMultipleRoles"
          :model-value="auth.currentRole"
          size="small"
          class="role-select"
          @change="onRoleChange"
        >
          <el-option
            v-for="role in auth.roles"
            :key="role.roleCode"
            :label="role.roleName"
            :value="role.roleCode"
          />
        </el-select>
        <el-dropdown trigger="click" @command="onCommand">
          <span class="user">
            <el-avatar :size="28" class="user-avatar">
              {{ (auth.user?.realName || auth.user?.username || '?').slice(0, 1) }}
            </el-avatar>
            <div class="user-info">
              <span class="user-name">{{ auth.user?.realName || auth.user?.username }}</span>
              <span class="user-role">{{ auth.roleName }}</span>
            </div>
            <el-icon class="user-caret"><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item disabled>{{ auth.roleName }}</el-dropdown-item>
              <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-header>

    <!-- ========= 横向菜单条 ========= -->
    <div class="navbar">
      <el-menu :default-active="route.path" router mode="horizontal" class="nav-menu">
        <el-menu-item v-for="item in currentMenus" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.title }}</span>
        </el-menu-item>
      </el-menu>
    </div>

    <!-- ========= 内容区 ========= -->
    <el-main class="main">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Clock } from '@element-plus/icons-vue'
import { menus } from '@/router/menus'
import { ROLE_HOME } from '@/config/stages'
import { useAuthStore } from '@/stores/auth'
import { useCycleStore } from '@/stores/cycle'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const cycleStore = useCycleStore()

const currentMenus = computed(() => menus[auth.currentRole] ?? [])

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
    auth.logout()
    router.replace('/login')
    ElMessage.success('已退出登录')
  }
}

async function onRoleChange(value: string | number | boolean | undefined) {
  const roleCode = String(value ?? '')
  if (!roleCode || roleCode === auth.currentRole) return
  await auth.switchRole(roleCode)
  await cycleStore.load(true)
  router.replace(ROLE_HOME[roleCode] || '/')
}

onMounted(() => {
  auth.refresh().catch(() => undefined)
  cycleStore.load()
  timer = window.setInterval(() => { now.value = Date.now() }, 1000)
})
onUnmounted(() => { if (timer) window.clearInterval(timer) })
</script>

<style scoped>
/* ===== 布局 ===== */
.layout {
  height: 100%;
  background: #f5f7fb;
}

/* ===== 顶栏：纯白 + 底部细线 ===== */
.topbar {
  background: #fff;
  border-bottom: 1px solid #eef0f5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 0 28px;
  position: relative;
}
/* 左侧一条细细的彩色点缀条 */
.topbar::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, #2f6fed, #6f9bff);
}

/* ---- 品牌 ---- */
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}
.brand-mark {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #2f6fed, #6f9bff);
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 6px rgba(47, 111, 237, 0.28);
}
.brand-text {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.brand-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}
.brand-sub {
  font-size: 11px;
  color: #9aa3b2;
  letter-spacing: 0.5px;
}

/* ---- 阶段 Pill ---- */
.stage-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 14px 4px 10px;
  height: 34px;
  background: #f0f5ff;
  border: 1px solid #dbe6ff;
  border-radius: 17px;
  font-size: 13px;
  flex: 1;
  max-width: 520px;
  justify-content: center;
  color: #3b4663;
}
.stage-pill-icon {
  font-size: 14px;
  color: #2f6fed;
}
.stage-pill-label {
  font-size: 11px;
  color: #7b8aa8;
  margin-right: 2px;
}
.stage-pill-name {
  font-weight: 600;
  color: #1f2937;
}
.stage-pill-countdown {
  color: #2f6fed;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  font-size: 12px;
}

/* ---- 右侧 ---- */
.topbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.role-select {
  width: 120px;
}

.user {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 2px 10px 2px 2px;
  border-radius: 18px;
  transition: background 0.15s;
}
.user:hover { background: #f4f6fb; }

.user-avatar {
  background: #e8f0ff;
  color: #2f6fed;
  font-weight: 600;
  font-size: 13px;
}

.user-info {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}
.user-name {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}
.user-role {
  font-size: 10.5px;
  color: #9aa3b2;
}
.user-caret {
  font-size: 11px;
  color: #c4c9d4;
}

/* ===== 导航条 ===== */
.navbar {
  background: #fff;
  border-bottom: 1px solid #eef0f5;
  padding: 0 24px;
}
.nav-menu {
  border-bottom: none;
  height: 46px;
  line-height: 46px;
  background: transparent;
}
.nav-menu :deep(.el-menu-item) {
  height: 46px;
  line-height: 46px;
  border-bottom: 2px solid transparent !important;
  margin: 0 2px;
  padding: 0 14px !important;
  font-size: 13px;
  color: #5b6472;
}
.nav-menu :deep(.el-menu-item:hover) {
  color: #2f6fed;
  background: transparent;
}
.nav-menu :deep(.el-menu-item.is-active) {
  color: #2f6fed !important;
  font-weight: 600;
  border-bottom: 2px solid #2f6fed !important;
  background: transparent !important;
}
.nav-menu :deep(.el-icon) {
  margin-right: 5px;
  font-size: 14px;
}

/* ===== 主内容区 ===== */
.main {
  padding: 20px 24px;
  overflow-y: auto;
  background: #f5f7fb;
}
</style>
