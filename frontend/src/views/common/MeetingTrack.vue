<template>
  <video v-if="video" ref="element" autoplay playsinline muted />
  <audio v-else ref="element" autoplay />
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import type { Track } from 'livekit-client'

const props = defineProps<{ track: Track; video?: boolean }>()
const element = ref<HTMLMediaElement>()
watchEffect(onCleanup => {
  const node = element.value
  if (!node) return
  const track = props.track
  track.attach(node)
  onCleanup(() => { track.detach(node) })
}, { flush: 'post' })
</script>
