<template>
  <el-timeline>
    <el-timeline-item
      v-for="(item, index) in items"
      :key="index"
      :timestamp="item.time"
      :type="item.type || 'primary'"
    >
      <div>{{ item.title }}</div>
      <div v-if="item.desc" class="muted desc">{{ item.desc }}</div>
    </el-timeline-item>
  </el-timeline>
</template>

<script setup>
defineProps({ items: { type: Array, default: () => [] } })
</script>

<style scoped>
.desc { margin-top: 4px; }
</style>
