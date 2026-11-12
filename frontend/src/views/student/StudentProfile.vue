<template>
  <section v-loading="loading" class="student-page">
    <h1>个人信息与简历</h1>
    <el-card shadow="never">
      <h2>账号资料</h2>
      <dl class="student-fields">
        <dt>登录账号</dt><dd>{{ auth.user?.username }}</dd>
        <dt>姓名</dt><dd>{{ auth.user?.realName }}</dd>
        <dt>角色</dt><dd>学生</dd>
      </dl>
    </el-card>
    <el-card shadow="never">
      <h2>我的简历</h2>
      <p v-if="studentMvp">提交志愿后，所填实训室有权限的导师可查看你最近一次保存的简历。</p>
      <el-button v-if="failed" @click="load">重新读取简历</el-button>
      <el-form label-position="top" :disabled="loading || failed || saving" @submit.prevent="save">
        <el-form-item label="联系电话">
          <el-input v-model="resume.phone" type="tel" maxlength="24" />
        </el-form-item>
        <el-form-item label="专业与年级">
          <el-input v-model="resume.major" maxlength="80" />
        </el-form-item>
        <el-form-item label="专业技能">
          <el-input v-model="resume.skills" type="textarea" maxlength="300" show-word-limit />
        </el-form-item>
        <el-form-item label="项目、竞赛与实践经历">
          <el-input v-model="resume.experience" type="textarea" :rows="5" maxlength="1000" show-word-limit />
        </el-form-item>
        <el-form-item label="自我介绍">
          <el-input v-model="resume.introduction" type="textarea" :rows="4" maxlength="500" show-word-limit />
        </el-form-item>
        <el-button type="primary" native-type="submit" :loading="saving" :disabled="loading || failed">保存简历</el-button>
      </el-form>
      <p><RouterLink to="/student/application/record">查看我的填报回执</RouterLink></p>
    </el-card>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useStudentStore } from '@/stores/student'
import { studentMvp, studentMvpApi, type StudentResume } from '@/api/studentMvp'

const auth = useAuthStore()
const student = useStudentStore()
const resume = ref<StudentResume>({
  phone: studentMvp ? '' : student.data.phone, major: '', skills: '', experience: '', introduction: '',
  ...(studentMvp ? {} : student.data.resume)
})
const loading = ref(studentMvp)
const saving = ref(false)
const failed = ref(false)

async function load() {
  loading.value = true
  failed.value = false
  try {
    resume.value = await studentMvpApi.resume()
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

onMounted(() => { if (studentMvp) void load() })

async function save() {
  if (loading.value || failed.value || saving.value) return
  const value = resume.value.phone.trim()
  if (value && !/^\+?[\d ()-]{5,24}$/.test(value)) {
    ElMessage.error('请输入有效的联系电话')
    return
  }
  const draft = { ...resume.value, phone: value }
  saving.value = true
  try {
    if (studentMvp) {
      resume.value = await studentMvpApi.saveResume(draft)
    } else {
      student.data.phone = value
      student.data.resume = draft
      student.save()
      resume.value = draft
    }
    ElMessage.success('简历已保存')
  } catch {
    // 请求层显示错误，保留草稿供重试。
  } finally {
    saving.value = false
  }
}
</script>
