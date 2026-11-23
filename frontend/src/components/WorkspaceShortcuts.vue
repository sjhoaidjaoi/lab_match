<template>
  <section class="service-panel">
    <h2>{{ title }}</h2>
    <div v-for="group in sections" :key="group.title" class="service-group">
      <h3>{{ group.title }}</h3>
      <nav class="service-list" :aria-label="group.title">
        <RouterLink v-for="item in group.items" :key="item.path" :to="item.path" class="service">
          <el-icon class="service-icon" aria-hidden="true"><component :is="item.icon" /></el-icon>
          <span class="service-text"><strong>{{ item.title }}</strong><small v-if="item.detail">{{ item.detail }}</small></span>
          <el-icon class="service-arrow" aria-hidden="true"><ArrowRight /></el-icon>
        </RouterLink>
      </nav>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { menus, type MenuItem } from '@/router/menus'
import { studentMvp } from '@/api/studentMvp'

type Entry = Omit<MenuItem, 'children'> & { detail?: string }
const props = defineProps<{ title: string; items: Entry[] }>()
const auth = useAuthStore()
const sections = computed(() => {
  const role = auth.currentRole
  const student = role === 'STUDENT'
  const prefixes: Record<string, string> = { LAB_TEACHER: '/teacher', LAB_LEADER: '/leader', COLLEGE_ADMIN: '/college', STUDENT: '/student' }
  const entries = menus[role] || []
  const details = new Map(props.items.map(item => [item.path, item]))
  const groups: { title: string; items: Entry[] }[] = entries.filter(item => item.children).map(group => ({
    title: group.title, items: group.children!.map(item => details.get(item.path) || item)
  }))
  const other: Entry[] = entries.filter(item => !item.children && !item.path.endsWith('/dashboard'))
  if (!student || !studentMvp) other.push({ path: student ? '/student/messages' : '/announcements', title: student ? '消息通知' : '系统公告', icon: 'Bell' })
  other.push({ path: student ? '/student/profile' : '/profile', title: '个人信息', icon: 'User' })
  if (role !== 'COLLEGE_ADMIN') other.push({ path: prefixes[role] + '/help', title: '帮助与说明', icon: 'QuestionFilled' })
  groups.push({ title: '资料与服务', items: other.map(item => details.get(item.path) || item) })
  return groups
})
</script>

<style scoped>
/* 业务入口从「一行行文字链接」升级为卡片网格：
   图标装进浅橙方章，标题与说明分层，箭头在 hover 时右移 —— 这是整页
   最容易显得像后台的地方，也是最能提升「像产品」的地方。 */
.service-panel { display: grid; gap: 4px; }
.service-panel > h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 6px;
  color: var(--px-ink, #191b1e);
  font-size: 16px;
  font-weight: 720;
  letter-spacing: -.012em;
}
.service-panel > h2::before {
  content: '';
  width: 4px;
  height: 15px;
  border-radius: 2px;
  background: linear-gradient(180deg, #ef7a2c, #c9450b);
}

.service-group {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 6px 22px;
  padding: 14px 0;
  border-top: 1px solid var(--px-line, #e9e1d6);
}
.service-group:first-of-type { border-top: 0; }
.service-group h3 {
  margin: 14px 0 0;
  color: var(--px-faint, #8b857c);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: .08em;
}

.service-list {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
@media (max-width: 1280px) { .service-list { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 980px) { .service-list { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 620px) { .service-list { grid-template-columns: minmax(0, 1fr); } }
.service-list .service {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 74px;
  padding: 13px 14px;
  border: 1px solid var(--px-line, #e9e1d6);
  border-radius: 14px;
  background: #fffefc;
  box-shadow: 0 1px 1px rgba(66, 45, 28, .03);
  color: var(--workspace-ink);
  text-decoration: none;
  transition: box-shadow .36s var(--lg-ease), border-color .36s var(--lg-ease), transform .36s var(--lg-ease);
}
@media (hover: hover) {
  .service-list .service:hover {
    border-color: #e6cdb4;
    box-shadow: 0 2px 4px rgba(66, 45, 28, .04), 0 16px 30px -22px rgba(66, 45, 28, .45);
    transform: translateY(-2px);
  }
  .service-list .service:hover .service-arrow { transform: translateX(3px); color: var(--px-accent, #c9450b); }
  .service-list .service:hover .service-icon { background: linear-gradient(150deg, #ffe3c8, #ffd0a6); color: #a83c07; }
}
.service-icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(150deg, #fff2e2, #ffe6cf);
  color: #b8490c;
  font-size: 17px;
  transition: background .36s var(--lg-ease), color .36s var(--lg-ease);
}
.service-list .service-text { flex-direction: column; align-items: flex-start; gap: 3px; }
.service-text { display: flex; flex: 1; justify-content: space-between; min-width: 0; }
.service-text strong { font-size: 14px; font-weight: 660; color: var(--px-ink, #191b1e); letter-spacing: -.005em; }
.service-text small { color: var(--px-faint, #8b857c); font-size: 12px; line-height: 1.4; }
.service-arrow { flex: none; color: #c0b4a4; font-size: 13px; transition: transform .36s var(--lg-ease), color .36s var(--lg-ease); }

@media (max-width: 700px) {
  .service-group { grid-template-columns: 1fr; gap: 4px; }
  .service-group h3 { margin: 6px 0 2px; }
  .service-list { grid-template-columns: minmax(0, 1fr); }
}
</style>
