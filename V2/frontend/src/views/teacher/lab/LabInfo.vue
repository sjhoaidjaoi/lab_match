<template>
  <div class="page">
    <PageHeader title="本室信息" desc="仅展示当前账号所属实训室；组长可编辑本室介绍，普通教师只读，无法查看其他实训室数据。">
      <template #actions>
        <el-button :disabled="!canEdit" type="primary" @click="onEdit">
          {{ canEdit ? '编辑本室介绍' : '无编辑权限' }}
        </el-button>
      </template>
    </PageHeader>

    <el-alert
      v-if="!canEdit"
      title="当前账号只有查看权限，编辑需实训室组长或学院授权。"
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 16px"
    />

    <div class="card">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="实训室名称">{{ lab.name }}</el-descriptions-item>
        <el-descriptions-item label="负责人">{{ lab.leader }}</el-descriptions-item>
        <el-descriptions-item label="项目方向">{{ room.labInfo.direction }}</el-descriptions-item>
        <el-descriptions-item label="招生名额">{{ lab.quota }} 人</el-descriptions-item>
        <el-descriptions-item label="主要技术栈">{{ room.labInfo.techStack }}</el-descriptions-item>
        <el-descriptions-item label="考核方式">统一面试（五维评分）</el-descriptions-item>
        <el-descriptions-item label="项目介绍" :span="2">
          {{ room.labInfo.intro }}
        </el-descriptions-item>
        <el-descriptions-item label="培养安排" :span="2">
          {{ room.labInfo.training }}
        </el-descriptions-item>
        <el-descriptions-item label="学生基础要求" :span="2">
          {{ room.labInfo.requirement }}
        </el-descriptions-item>
      </el-descriptions>
    </div>

    <el-dialog v-model="dialog" title="编辑本室介绍" width="560px">
      <el-form :model="form" label-width="110px">
        <el-form-item label="项目方向"><el-input v-model="form.direction" /></el-form-item>
        <el-form-item label="主要技术栈"><el-input v-model="form.techStack" /></el-form-item>
        <el-form-item label="项目介绍"><el-input v-model="form.intro" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="培养安排"><el-input v-model="form.training" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="学生基础要求"><el-input v-model="form.requirement" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" @click="onSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import { labs } from '@/mock/labs'
import { useAuthStore } from '@/stores/auth'
import { useRoomStore } from '@/stores/room'

const auth = useAuthStore()
const room = useRoomStore()
const lab = computed(() => labs.find((l) => l.id === auth.laboratoryId) || labs[0])
const canEdit = auth.isLeader
const dialog = ref(false)
const form = reactive({ ...room.labInfo })

function onEdit() {
  Object.assign(form, room.labInfo)
  dialog.value = true
}

function onSave() {
  if (Object.values(form).some((v) => !String(v).trim())) {
    ElMessage.warning('各项介绍内容不能为空')
    return
  }
  room.saveLabInfo({ ...form })
  dialog.value = false
  ElMessage.success('本室介绍已更新')
}
</script>
