<template>
  <div class="page">
    <PageHeader title="时间变更申请" desc="时间点由学院统一维护；本页只提交申请，不直接修改阶段时间。">
      <template #actions>
        <el-tag type="info" effect="plain">对接学院端</el-tag>
      </template>
    </PageHeader>

    <el-alert
      type="warning"
      :closable="false"
      show-icon
      title="当前系统时间固定，前端不提供改时间入口。需要调整请提交申请，由学院端审批后修改。"
      style="margin-bottom: 16px"
    />

    <div class="card">
      <h3 class="block-title">提交申请</h3>
      <el-form label-width="110px" style="max-width: 620px">
        <el-form-item label="阶段">
          <el-select v-model="form.stageNo" style="width: 100%">
            <el-option v-for="s in stages" :key="s.no" :label="`第 ${s.no} 阶段 · ${s.name}`" :value="s.no" />
          </el-select>
        </el-form-item>
        <el-form-item label="建议开始">
          <el-date-picker v-model="form.proposedStart" type="datetime" value-format="YYYY-MM-DD HH:mm" style="width: 100%" />
        </el-form-item>
        <el-form-item label="建议结束">
          <el-date-picker v-model="form.proposedEnd" type="datetime" value-format="YYYY-MM-DD HH:mm" style="width: 100%" />
        </el-form-item>
        <el-form-item label="申请理由">
          <el-input v-model="form.reason" type="textarea" :rows="3" placeholder="如：设备调试，申请延长开放日" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSubmit">提交申请</el-button>
          <el-button @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="card">
      <h3 class="block-title">申请记录</h3>
      <el-table :data="requests.forLab(auth.laboratoryId)" size="small">
        <el-table-column label="阶段" width="160">
          <template #default="{ row }">第 {{ row.stageNo }} 阶段</template>
        </el-table-column>
        <el-table-column prop="proposedStart" label="建议开始" width="170" />
        <el-table-column prop="proposedEnd" label="建议结束" width="170" />
        <el-table-column prop="reason" label="理由" min-width="220" show-overflow-tooltip />
        <el-table-column label="状态" width="110">
          <template #default="{ row }"><StatusTag :status="row.status" :label="row.status === 'PENDING' ? '待审批' : ''" /></template>
        </el-table-column>
        <el-table-column prop="createdAt" label="提交时间" width="160" />
      </el-table>
      <el-empty v-if="!requests.forLab(auth.laboratoryId).length" description="暂无申请记录" />
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { ElMessage } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import { useStageStore } from '@/stores/stage'
import { useTimeRequestsStore } from '@/stores/timeRequests'
import { useAuthStore } from '@/stores/auth'

const stage = useStageStore()
const requests = useTimeRequestsStore()
const auth = useAuthStore()
const stages = stage.stages

const form = reactive({ stageNo: stage.current.no, proposedStart: '', proposedEnd: '', reason: '' })

function onReset() {
  form.stageNo = stage.current.no
  form.proposedStart = ''
  form.proposedEnd = ''
  form.reason = ''
}

function onSubmit() {
  if (!form.proposedStart || !form.proposedEnd) {
    ElMessage.warning('请填写建议的开始与结束时间')
    return
  }
  if (form.proposedStart >= form.proposedEnd) {
    ElMessage.warning('结束时间必须晚于开始时间')
    return
  }
  if (!requests.create({ ...form })) {
    ElMessage.warning('请完整填写理由；同一阶段已有待审批申请时不能重复提交')
    return
  }
  ElMessage.success('申请已提交，等待学院端处理')
  onReset()
}
</script>

<style scoped>
.block-title { margin: 0 0 12px; font-size: 15px; }
</style>
