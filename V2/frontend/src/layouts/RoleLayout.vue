<template>
  <el-container class="layout">
    <el-aside v-if="!isMobile" width="228px" class="aside">
      <div class="brand">
        <div class="brand-title">实训室选拔平台</div>
        <div class="brand-sub">软件学院 · 双向选择</div>
      </div>
      <SideMenu :groups="groups" :active="route.path" />
    </el-aside>

    <el-drawer v-model="menuOpen" direction="ltr" size="248px" :with-header="false">
      <div class="brand">
        <div class="brand-title">实训室选拔平台</div>
        <div class="brand-sub">软件学院 · 双向选择</div>
      </div>
      <SideMenu :groups="groups" :active="route.path" @navigate="menuOpen = false" />
    </el-drawer>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-button v-if="isMobile" link class="menu-btn" title="打开菜单" aria-label="打开菜单" @click="menuOpen = true">☰</el-button>
          <el-tag v-if="!isMobile" size="small" type="info" effect="plain">{{ batch.label }}</el-tag>
          <span class="lab-name">{{ auth.laboratoryName }}</span>
          <el-tag size="small" effect="plain">{{ roleLabel }}</el-tag>
        </div>
        <div class="header-right">
          <el-badge :value="visibleUnread" :hidden="visibleUnread === 0">
            <el-button link class="notify-btn" @click="notifyOpen = true">通知</el-button>
          </el-badge>
          <span class="muted">{{ auth.realName || '演示账号' }}</span>
          <el-button link type="primary" @click="onLogout">退出</el-button>
        </div>
      </el-header>

      <el-main class="main">
        <el-alert v-if="syncNeeded" type="warning" :closable="false" show-icon class="sync-alert">
          <template #title>
            其他窗口已更新数据，当前页面可能有未保存的修改
            <el-button size="small" type="primary" link @click="applyStorageSync">立即同步</el-button>
            <el-button size="small" link @click="syncNeeded = false">稍后</el-button>
          </template>
        </el-alert>
        <StageBanner />
        <router-view />
      </el-main>
    </el-container>

    <el-drawer v-model="notifyOpen" title="通知" size="380px">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="演示数据；接入后端推送后由服务端写入"
        style="margin-bottom: 12px"
      />
      <el-empty v-if="!visibleNotifications.length" description="暂无通知" />
      <div
        v-for="n in visibleNotifications"
        :key="n.id"
        class="notify-item"
        :class="{ unread: !n.read }"
        role="button"
        tabindex="0"
        @click="openNotify(n)"
        @keydown.enter="openNotify(n)"
      >
        <div class="notify-title">{{ n.title }}</div>
        <div class="muted">{{ n.content }}</div>
        <div class="notify-time">{{ n.time }}</div>
      </div>
      <template #footer>
        <el-button :disabled="!visibleUnread" @click="markVisibleRead">全部已读</el-button>
      </template>
    </el-drawer>
  </el-container>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useBatchStore } from '@/stores/batch'
import { useStageStore } from '@/stores/stage'
import { useClockStore } from '@/stores/clock'
import { useConfigStore } from '@/stores/config'
import { useLogsStore } from '@/stores/logs'
import { useNotificationsStore } from '@/stores/notifications'
import { useRoomStore } from '@/stores/room'
import { useInterviewsStore } from '@/stores/interviews'
import { useSubmissionStore } from '@/stores/submission'
import { menuGroupsOf, roleLabels } from '@/config/menus'
import StageBanner from '@/components/StageBanner.vue'
import SideMenu from '@/components/SideMenu.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const batch = useBatchStore()
const stage = useStageStore()
const clock = useClockStore()
const config = useConfigStore()
const logs = useLogsStore()
const notifications = useNotificationsStore()
const room = useRoomStore()
const interviews = useInterviewsStore()
const submission = useSubmissionStore()

const notifyOpen = ref(false)
const syncNeeded = ref(false)
const visibleNotifications = computed(() =>
  notifications.visibleSorted(auth.role, auth.laboratoryId, auth.realName)
)
const visibleUnread = computed(() =>
  notifications.unreadFor(auth.role, auth.laboratoryId, auth.realName)
)
function markVisibleRead() {
  visibleNotifications.value.forEach((n) => notifications.markRead(n.id))
}

function checkReminders() {
  const now = clock.now.getTime()
  const defs = [
    { key: 'eval', no: 4, label: '面试评价', link: '/teacher/interviews' },
    { key: 'confirm', no: 5, label: '拟录取确认', link: '/teacher/confirmations' },
    { key: 'adjust', no: 6, label: '内部调剂', link: '/teacher/room/adjustments', role: 'LAB_LEADER' }
  ]
  defs.forEach((d) => {
    const target = stage.stages.find((x) => x.no === d.no)
    if (!target) return
    const end = new Date(target.end.replace(' ', 'T')).getTime()
    const diff = end - now
    if (diff <= 0 || diff > 48 * 3600 * 1000) return
    const flag = `trs_reminded_${auth.laboratoryId}_${auth.role}_${d.key}_${target.end}`
    if (localStorage.getItem(flag)) return
    notifications.push({
      type: 'REMIND',
      title: `${d.label}即将截止`,
      content: `请在 ${target.end} 前完成`,
      audience: { labId: auth.laboratoryId, ...(d.role ? { role: d.role } : {}) },
      link: d.link
    })
    localStorage.setItem(flag, '1')
  })
}

function onStorage(event) {
  if (!event.key || !event.key.startsWith('trs_')) return
  // 不静默覆盖正在编辑的页面，提示用户手动同步
  syncNeeded.value = true
}

function applyStorageSync() {
  room.reload()
  interviews.reload()
  submission.refresh()
  notifications.reload()
  config.reload()
  logs.reload()
  interviews.recalculateTotals(config.weights)
  syncNeeded.value = false
  ElMessage.success('已同步其他窗口的数据')
}

function openNotify(item) {
  notifications.markRead(item.id)
  if (item.link?.startsWith('/teacher/room') && !auth.isLeader) {
    notifyOpen.value = false
    ElMessage.warning('该通知仅实训室组长可处理')
    return
  }
  notifyOpen.value = false
  if (item.link) router.push(item.link)
}

const roleLabel = computed(() => roleLabels[auth.role] || '未识别角色')
const groups = computed(() =>
  menuGroupsOf(auth.role)
    .filter((g) => !g.leaderOnly || auth.isLeader)
    .map((g) => ({ ...g, items: g.leaderOnly && !auth.isLeader ? [] : g.items }))
    .filter((g) => g.items.length > 0)
)

// 移动端：侧边栏收进抽屉
const isMobile = ref(false)
const menuOpen = ref(false)
let media = null
let clockTimer = 0
let reminderTimer = 0

function syncMobile(event) {
  isMobile.value = event.matches
  if (!event.matches) menuOpen.value = false
}

onMounted(() => {
  media = window.matchMedia('(max-width: 900px)')
  isMobile.value = media.matches
  media.addEventListener('change', syncMobile)
  clockTimer = window.setInterval(() => {
    clock.tickNow()
    stage.syncToClock()
    // 每 30 秒清理一次超时补位
    if (clock.tick % 30 === 0) room.expireStalePromotions(clock.now)
  }, 1000)
  reminderTimer = window.setInterval(checkReminders, 10 * 60 * 1000)
  stage.syncToClock()
  // 一个账号只属于一个实训室：登录后把各 store 对齐到该室
  if (room.labId !== auth.laboratoryId) {
    interviews.switchLab(auth.laboratoryId)
    room.switchLab(auth.laboratoryId)
    submission.switchLab(auth.laboratoryId)
  }
  notifications.ensureSeed(auth.laboratoryId)
  room.expireStalePromotions(clock.now)
  checkReminders()
  window.addEventListener('storage', onStorage)
  // 可选：VITE_STAGE_SYNC / VITE_BATCH_SYNC 为 true 时从后端拉取
  void stage.syncFromServer()
  void batch.syncFromServer()
  interviews.recalculateTotals(config.weights)
})

onBeforeUnmount(() => {
  media?.removeEventListener('change', syncMobile)
  if (clockTimer) window.clearInterval(clockTimer)
  if (reminderTimer) window.clearInterval(reminderTimer)
  window.removeEventListener('storage', onStorage)
})

function onLogout() {
  auth.logout()
  router.replace('/login')
}
</script>

<style scoped>
.layout { height: 100%; }
.aside { background: #fff; border-right: 1px solid var(--trs-border); display: flex; flex-direction: column; }
.brand { padding: 18px 16px 12px; border-bottom: 1px solid var(--trs-border); }
.brand-title { font-size: 15px; font-weight: 600; }
.brand-sub { margin-top: 4px; font-size: 12px; color: var(--trs-muted); }
.header { height: 56px; background: #fff; border-bottom: 1px solid var(--trs-border); display: flex; align-items: center; justify-content: space-between; padding: 0 16px; }
.header-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
.lab-name { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.header-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.main { background: var(--trs-bg); padding: 0; }
.menu-btn { font-size: 18px; }
.sync-alert { margin: 12px 20px 0; }
.notify-btn { font-size: 13px; }
.notify-item { padding: 12px 8px; border-bottom: 1px solid var(--trs-border); cursor: pointer; }
.notify-item.unread { background: #f2f6ff; }
.notify-title { font-size: 14px; font-weight: 500; margin-bottom: 4px; }
.notify-time { margin-top: 6px; font-size: 12px; color: var(--trs-muted); }
</style>
