<template>
  <div class="workspace-ribbon">
    <div>
      <strong>{{ content.title }}</strong>
      <p>{{ content.description }}</p>
    </div>
    <div class="workspace-ribbon-code" aria-hidden="true">
      <span class="workspace-ribbon-sigil">&lt;/&gt;</span>
      <code>{{ content.code }}</code>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ role: string }>()
const roles: Record<string, { title: string; description: string; code: string }> = {
  STUDENT: { title: '学生工作台', description: '探索实训室、提交志愿并查看选拔结果。', code: 'preferences.submit()' },
  LAB_TEACHER: { title: '实训室教师工作台', description: '查看报名、组织面试并提交拟录取建议。', code: 'review(application)' },
  LAB_LEADER: { title: '实训室组长工作台', description: '统筹本室选拔、名额与内部调剂。', code: 'capacity.check()' },
  COLLEGE_ADMIN: { title: '学院总负责人工作台', description: '管理选拔批次、统筹调剂与结果公示。', code: 'batch.publish()' }
}
const content = computed(() => roles[props.role] ?? roles.STUDENT)
</script>
