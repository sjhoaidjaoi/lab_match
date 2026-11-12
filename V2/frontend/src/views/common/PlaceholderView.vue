<template>
  <div class="page">
    <PageHeader :title="title" desc="该页面由对应模块负责人实现，当前仅保证路由与菜单连通。" />
    <div class="card">
      <el-empty :description="`${title} · 待对应模块接入`">
        <p class="muted">接口与字段待 docs/API.md 确认后接入。</p>
      </el-empty>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'

const route = useRoute()
const title = computed(() => route.meta.title || '占位页面')
</script>
