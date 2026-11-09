<template>
  <div class="panorama-viewer">
    <div v-if="!item" class="empty">
      <el-empty description="暂无全景资源" />
    </div>
    <template v-else>
      <iframe
        v-if="item.panoramaType === 'LINK'"
        :key="item.id"
        :src="item.panoramaUrl"
        class="media"
        allowfullscreen
        referrerpolicy="no-referrer"
      />
      <div v-else class="image-wrap">
        <img
          v-if="!failed"
          :key="item.id"
          :src="item.panoramaUrl"
          class="media image"
          :alt="item.name"
          @error="failed = true"
        />
        <el-result v-else icon="warning" title="全景图暂不可用" :sub-title="item.panoramaUrl" />
        <p class="tip">
          等距柱状全景图直链：接入 Pannellum / three.js 后即可在此实现拖拽与热点漫游。
        </p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { PanoramaItem } from '@/types'

const props = defineProps<{ item: PanoramaItem | null }>()

const failed = ref(false)
watch(
  () => props.item?.id,
  () => {
    failed.value = false
  }
)
</script>

<style scoped>
.empty {
  padding: 40px 0;
}

.media {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
  background: #0f172a;
}

.image-wrap {
  height: 100%;
  background: #fff;
}

.image {
  object-fit: cover;
}

.tip {
  margin: 10px 12px 12px;
  color: var(--lm-text-secondary);
  font-size: 12px;
}
</style>
