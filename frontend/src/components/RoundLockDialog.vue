<template>
  <el-dialog
    v-model="visible"
    :title="`${locked ? '批次解锁' : '批次锁定'} · ${round?.roundName ?? ''}`"
    width="520px"
    destroy-on-close
  >
    <el-alert
      v-if="locked"
      type="warning"
      :closable="false"
      show-icon
      title="解锁后公示批次将由「已确认」退回「进行中」，并强制重新生成归档快照，请谨慎操作。"
    />
    <el-alert
      v-else
      type="warning"
      :closable="false"
      show-icon
      title="锁定后全系统只读，所有业务写接口将返回 400005，仅快照生成与解锁豁免。"
    />

    <el-form label-width="90px" class="form">
      <el-form-item label="操作原因" required>
        <el-input
          v-model="reason"
          type="textarea"
          :rows="3"
          maxlength="500"
          show-word-limit
          placeholder="请填写本次操作原因，将写入操作日志"
        />
      </el-form-item>
      <el-form-item v-if="locked" label="管理员密码" required>
        <el-input
          v-model="password"
          type="password"
          show-password
          placeholder="请输入当前登录密码（Mock：123456）"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">
        {{ locked ? '确认解锁' : '确认锁定' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { MockError } from '@/mock/auth'
import { mockLockRound, mockUnlockRound } from '@/mock/archive'
import type { RoundListItem } from '@/types/basic'

const props = defineProps<{ modelValue: boolean; round: RoundListItem | null }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  done: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const locked = computed(() => props.round?.locked === 1)
const reason = ref('')
const password = ref('')
const submitting = ref(false)

async function submit() {
  if (!props.round) {
    return
  }
  if (!reason.value.trim()) {
    ElMessage.warning('请填写操作原因')
    return
  }
  if (locked.value && !password.value) {
    ElMessage.warning('请输入管理员密码')
    return
  }
  submitting.value = true
  try {
    if (locked.value) {
      await mockUnlockRound(props.round.id, password.value, reason.value)
      ElMessage.success('批次已解锁，公示已退回进行中并重新生成归档快照')
    } else {
      await mockLockRound(props.round.id, reason.value)
      ElMessage.success('批次已锁定，全系统进入只读状态')
    }
    emit('done')
    visible.value = false
    reason.value = ''
    password.value = ''
  } catch (error) {
    ElMessage.error(error instanceof MockError ? error.message : '操作失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.form {
  margin-top: 16px;
}
</style>
