<template>
  <div class="login-page">
    <div class="login-card">
      <div class="brand">
        <h1>学生实训室双向选拔与统筹调剂平台</h1>
        <p>软件学院 · 演示版 · 演示登录（无需密码）</p>
      </div>

      <div class="role-grid">
        <div v-for="item in roles" :key="item.role" class="role-item" role="button" tabindex="0" @click="enter(item)" @keydown.enter="enter(item)">
          <div class="role-name">
            {{ item.label }}
            <el-tag v-if="item.role === 'STUDENT' || item.role === 'COLLEGE_ADMIN'" size="small" type="info" effect="plain">占位</el-tag>
          </div>
          <div class="role-desc">{{ item.desc }}</div>
        </div>
      </div>

      <p class="tips">正式版本将改为账号密码登录，并由后端返回角色；此处为演示入口。</p>
    </div>

    <el-dialog v-model="teacherDialog" :title="`选择教师账号（${teachers.length} 个，按实训室）`" width="620px">
      <p class="muted" style="margin-top: 0">
        每个账号只属于一个实训室；组长额外拥有本室统筹功能，普通教师只管理自己负责的学生。
      </p>
      <div class="teacher-scroll">
        <div v-for="group in teacherGroups" :key="group.lab.id" class="lab-group">
          <div class="lab-title">
            第 {{ group.lab.id }} 室 · {{ group.lab.name }}
            <span class="muted">（名额 {{ group.lab.quota }}）</span>
          </div>
          <div
            v-for="t in group.teachers"
            :key="t.id"
            class="role-item teacher-item"
            role="button"
            tabindex="0"
            @click="enterTeacher(t)"
            @keydown.enter="enterTeacher(t)"
          >
            <div class="role-name">
              {{ t.name }}
              <el-tag v-if="t.isLeader" size="small" type="warning" effect="plain">组长</el-tag>
            </div>
            <div class="role-desc">{{ t.isLeader ? '本室全部 + 统筹/调剂' : '只管理自己负责的学生' }}</div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { teachers } from '@/mock/teachers'
import { labs } from '@/mock/labs'
import { demoLabOf } from '@/config/demoAuth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const teacherDialog = ref(false)
const teacherGroups = labs.map((lab) => ({
  lab,
  teachers: teachers.filter((t) => t.labId === lab.id)
}))

const roles = [
  { role: 'STUDENT', label: '学生', desc: '宣讲 / 开放日 / 填报 / 录取确认', target: '/student/dashboard' },
  { role: 'LAB_TEACHER', label: '实训室教师', desc: '报名 / 面试 / 拟录取；组长授权账号自动多出统筹功能', target: '' },
  { role: 'COLLEGE_ADMIN', label: '学院总负责人', desc: '批次 / 全院调剂 / 公示', target: '/admin/dashboard' }
]

function enter(item) {
  if (item.role === 'LAB_TEACHER') {
    teacherDialog.value = true
    return
  }
  auth.login({ role: item.role, realName: item.label })
  router.replace(item.target)
}

// 演示直达：/login?as=leader&redirect=/teacher/room/adjustments
onMounted(() => {
  const map = { student: 'STUDENT', teacher: 'LAB_TEACHER', leader: 'LAB_LEADER', admin: 'COLLEGE_ADMIN' }
  const role = map[route.query.as]
  if (!role) return

  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  const lab = { laboratoryId: 1, laboratoryName: '智能感知与机器人实训室' }

  if (role === 'LAB_TEACHER' || role === 'LAB_LEADER') {
    const targetLab = Number(route.query.lab || 1)
    const pool = teachers.filter((t) => t.labId === targetLab)
    const t =
      pool.find((x) => x.isLeader === (role === 'LAB_LEADER')) ||
      pool.find((x) => x.isLeader) ||
      pool[0] ||
      teachers[0]
    const lab = demoLabOf(t)
    auth.login({ role, realName: t.name, laboratoryId: lab.id, laboratoryName: lab.name, laboratories: [lab] })
    router.replace(redirect || '/teacher/dashboard')
    return
  }

  auth.login({ role, realName: role, ...lab })
  router.replace(redirect || (role === 'STUDENT' ? '/student/dashboard' : '/admin/dashboard'))
})

function enterTeacher(t) {
  const lab = demoLabOf(t)
  auth.login({
    role: t.isLeader ? 'LAB_LEADER' : 'LAB_TEACHER',
    realName: t.name,
    laboratoryId: lab.id,
    laboratoryName: lab.name,
    laboratories: [lab]
  })
  teacherDialog.value = false
  router.replace('/teacher/dashboard')
}
</script>

<style scoped>
.login-page { min-height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #eef3ff, #f7f9fc 60%, #eaf4ff); padding: 24px; }
.login-card { width: 720px; max-width: 100%; background: #fff; border-radius: 16px; padding: 36px; box-shadow: 0 20px 50px rgba(31, 41, 55, 0.08); }
.brand h1 { margin: 0; font-size: 22px; }
.brand p { margin: 8px 0 0; color: var(--trs-muted); font-size: 13px; }
.role-grid { margin-top: 28px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
.role-item { border: 1px solid var(--trs-border); border-radius: 12px; padding: 18px; cursor: pointer; transition: all 0.15s; }
.role-item:hover { border-color: var(--trs-primary); box-shadow: 0 8px 20px rgba(47, 111, 237, 0.12); transform: translateY(-2px); }
.teacher-scroll { max-height: 460px; overflow: auto; padding-right: 4px; }
.lab-group { margin-bottom: 16px; }
.lab-title { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
.teacher-item { padding: 10px 14px; margin-bottom: 8px; }
.role-name { font-size: 16px; font-weight: 600; }
.role-desc { margin-top: 6px; font-size: 12px; color: var(--trs-muted); }
.tips { margin: 22px 0 0; font-size: 12px; color: var(--trs-muted); }
</style>
