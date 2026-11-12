<template>
  <section class="student-page">
    <h1>{{ record ? '我的填报记录' : '意向填报' }}</h1>
    <el-alert v-if="!record && !open" type="info" show-icon :closable="false"
      :title="student.currentNumber === 3 ? '已有录取或调剂记录，志愿已锁定' : '当前不在志愿填报窗口'" />
    <el-card v-if="!record" shadow="never">
      <h2>平行志愿</h2>
      <p>最多选择三个不同的实训室，志愿之间没有优先级。</p>
      <p>填报截止 {{ formatTime(student.timeline[2].end) }}</p>
      <p><RouterLink to="/student/labs">查看各实训室项目及招新要求</RouterLink></p>
      <el-checkbox-group v-model="student.data.draft.labIds" :max="3" :disabled="!open"
        class="student-choice" aria-label="平行志愿" @change="student.save">
        <el-checkbox v-for="lab in labs" :key="lab.id" :value="lab.id">
          {{ lab.name }} · 招生 {{ lab.quota }} 人 · {{ lab.direction }}
        </el-checkbox>
      </el-checkbox-group>
      <el-form label-position="top" class="student-actions">
        <el-form-item label="是否服从实训室内部调剂">
          <el-radio-group v-model="student.data.draft.internal" :disabled="!open" @change="student.save">
            <el-radio :value="true">服从</el-radio><el-radio :value="false">不服从</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="是否服从学院跨实训室调剂">
          <el-radio-group v-model="student.data.draft.college" :disabled="!open" @change="student.save">
            <el-radio :value="true">服从</el-radio><el-radio :value="false">不服从</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <el-button type="primary" :disabled="!open" @click="submit">{{ student.receipt ? '更新已提交志愿' : '提交志愿' }}</el-button>
      <p>演示设置允许截止前修改，表单变更会保存为本地草稿。</p>
    </el-card>
    <el-card shadow="never">
      <h2>提交回执</h2>
      <template v-if="student.receipt">
        <ul class="student-list"><li v-for="id in student.receipt.labIds" :key="id">{{ labName(id) }}</li></ul>
        <p>内部调剂 · {{ student.receipt.internal ? '服从' : '不服从' }}</p>
        <p>跨实训室调剂 · {{ student.receipt.college ? '服从' : '不服从' }}</p>
        <p>提交时间 · {{ formatTime(student.receipt.submittedAt) }}</p>
      </template>
      <el-empty v-else description="暂无提交记录" />
      <RouterLink v-if="record" to="/student/application">前往意向填报</RouterLink>
    </el-card>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useStudentStore } from '@/stores/student'
import { formatTime, labName, labs } from './studentDemo'

defineProps<{ record?: boolean }>()
const student = useStudentStore()
const open = computed(() => student.currentNumber === 3 && student.data.decisions.length === 0)

function submit() {
  const error = student.submitPreferences()
  if (error) ElMessage.error(error)
  else ElMessage.success('志愿已提交')
}
</script>
