<template>
  <el-menu :default-active="active" router class="menu" @select="$emit('navigate')">
    <template v-for="group in groups" :key="group.title">
      <div class="group-title">{{ group.title }}</div>
      <el-menu-item v-for="item in group.items" :key="item.path" :index="item.path">
        {{ item.title }}
      </el-menu-item>
    </template>
  </el-menu>
</template>

<script setup>
defineProps({
  groups: { type: Array, default: () => [] },
  active: { type: String, default: '' }
})
defineEmits(['navigate'])
</script>

<style scoped>
.menu { border-right: none; padding-bottom: 24px; }
.group-title { padding: 14px 20px 6px; font-size: 12px; color: var(--trs-muted); letter-spacing: 1px; }
</style>
