<template>
  <div class="page">
    <div class="page-header">
      <el-tag v-if="stage" size="small" effect="plain" class="stage-tag">{{ stage }}</el-tag>
      <h1 class="page-title">{{ title }}</h1>
      <p class="page-desc">{{ description }}</p>
    </div>

    <el-alert
      title="框架占位页"
      type="info"
      show-icon
      :closable="false"
      description="页面路由、布局与权限已就绪。请按下方清单在该文件中实现具体功能，接口与数据模型可参考 docs/requirements。"
      class="hint"
    />

    <el-row :gutter="16" class="content">
      <el-col :xs="24" :md="14">
        <el-card shadow="never" class="panel">
          <template #header><span class="panel-title">待实现清单</span></template>
          <el-checkbox-group v-model="checked" class="task-list">
            <el-checkbox v-for="task in tasks" :key="task" :value="task" class="task-item">
              {{ task }}
            </el-checkbox>
          </el-checkbox-group>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="10">
        <el-card shadow="never" class="panel">
          <template #header><span class="panel-title">相关接口</span></template>
          <ul class="code-list">
            <li v-for="api in apis" :key="api"><code>{{ api }}</code></li>
          </ul>
          <p v-if="owner" class="owner">负责小组：{{ owner }}</p>
        </el-card>
      </el-col>
    </el-row>

    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

withDefaults(
  defineProps<{
    title: string
    description: string
    stage?: string
    tasks?: string[]
    apis?: string[]
    owner?: string
  }>(),
  {
    stage: '',
    tasks: () => [],
    apis: () => [],
    owner: ''
  }
)

const checked = ref<string[]>([])
</script>

<style scoped>
.stage-tag {
  margin-bottom: 10px;
}

.hint {
  margin: 18px 0;
}

.panel-title {
  font-weight: 600;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-item {
  height: auto;
  white-space: normal;
  align-items: flex-start;
}

.owner {
  margin: 16px 0 0;
  color: var(--lm-text-secondary);
  font-size: 13px;
}
</style>
