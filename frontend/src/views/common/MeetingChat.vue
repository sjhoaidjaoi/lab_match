<template>
  <ol ref="history" class="chat-log" aria-label="会议消息" aria-live="polite">
    <li v-if="!items.length" class="empty">暂无消息</li>
    <li v-for="item in items" :key="item.id" :class="{ own: item.senderId === viewer }">
      <small>{{ item.senderId === viewer ? '我' : item.senderName }} · {{ formatDateTime(item.createdAt) }}</small>
      <p>{{ item.content }}</p>
    </li>
  </ol>
  <form v-if="!readonly" class="compose" @submit.prevent="$emit('send')">
    <el-input :model-value="modelValue" maxlength="1000" aria-label="聊天消息" placeholder="发送给会议成员"
      @update:model-value="$emit('update:modelValue', $event)" />
    <el-button native-type="submit" type="primary" :disabled="!modelValue?.trim()" :loading="sending">发送</el-button>
  </form>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import type { MeetingMessage } from '@/api/interviewVideo'
import { formatDateTime } from '@/api/student'
const props = defineProps<{ items: MeetingMessage[]; viewer?: number; modelValue?: string; sending?: boolean; readonly?: boolean }>()
defineEmits<{ send: []; 'update:modelValue': [value: string] }>()
const history = ref<HTMLOListElement>()
watchEffect(() => {
  if (props.items.length && history.value) history.value.scrollTop = history.value.scrollHeight
}, { flush: 'post' })
</script>

<style scoped>
.chat-log { display: grid; gap: 12px; max-height: min(48dvh, 420px); overflow: auto; padding: 8px 3px; list-style: none; }
.chat-log li { justify-self: start; max-width: 95%; overflow-wrap: anywhere; }
.chat-log .own { justify-self: end; text-align: right; }
.chat-log p { background: #f2ece6; border-radius: 10px; margin: 3px 0 0; padding: 7px 11px; white-space: pre-wrap; }
.own p { background: #f8dfd1; }
.chat-log small, .empty { color: #6d5b52; }
.compose { display: flex; gap: 8px; margin-top: 12px; }
</style>
