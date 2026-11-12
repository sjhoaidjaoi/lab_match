<template>
  <div class="page">
    <PageHeader title="规则开关（演示）" desc="Q6/Q7/Q8 等未定规则集中在此切换，用于验证页面对规则的响应。">
      <template #actions>
        <el-button @click="onReset">恢复默认</el-button>
      </template>
    </PageHeader>

    <el-alert
      type="warning"
      :closable="false"
      show-icon
      title="真实环境由学院端统一配置，通过 GET /api/meta/config 下发，前端只读。"
      description="这里允许本地切换，仅影响本浏览器的演示数据，不会改变其他端或后端。"
      style="margin-bottom: 16px"
    />

    <div class="card">
      <h3 class="block-title">调剂规则</h3>
      <div class="rule-row">
        <div>
          <div class="rule-name">Q6 · 内部调剂候选只来自本室报名学生</div>
          <div class="muted">跨室候选需学院端下发；本端不拉取其他实训室数据（A 室无权查看 B 室）</div>
        </div>
        <el-switch :model-value="config.rules.internalAdjustmentOnlyOwnApplicants" @change="onToggleQ6" />
      </div>

      <div class="rule-row">
        <div>
          <div class="rule-name">Q7 · 内部调剂必须学生再次确认</div>
          <div class="muted">关闭后，组长提交调剂方案即生效，跳过“学生确认”环节</div>
        </div>
        <el-switch
          :model-value="config.rules.requireStudentConfirmForAdjustment"
          @change="(v) => config.setRule('requireStudentConfirmForAdjustment', v)"
        />
      </div>

      <div class="rule-row">
        <div>
          <div class="rule-name">Q8 · 跨室调剂允许进入未填报的实训室</div>
          <div class="muted">属于学院端统筹调剂范围，教师/组长端只展示不生效</div>
        </div>
        <el-switch :model-value="config.rules.crossLabAdjustmentAllowsUnapplied" disabled />
      </div>

      <div class="rule-row">
        <div>
          <div class="rule-name">学生截止前可修改志愿</div>
          <div class="muted">学生端行为，教师端只读</div>
        </div>
        <el-switch :model-value="config.rules.allowEditPreferencesBeforeDeadline" disabled />
      </div>

      <div class="rule-row">
        <div>
          <div class="rule-name">名额调整需学院审批</div>
          <div class="muted">学院端行为，教师端只读</div>
        </div>
        <el-switch :model-value="config.rules.quotaAdjustmentNeedsApproval" disabled />
      </div>
    </div>

    <div class="card">
      <h3 class="block-title">评分权重（合计需为 100）</h3>
      <div class="weight-grid">
        <div v-for="item in weightItems" :key="item.key" class="weight-item">
          <span>{{ item.label }}</span>
          <el-input-number
            :model-value="config.weights[item.key]"
            :min="0"
            :max="100"
            :step="5"
            size="small"
            @change="(v) => onWeightChange(item.key, v)"
          />
        </div>
      </div>
      <div class="toolbar" style="margin-top: 12px">
        <el-tag :type="weightSum === 100 ? 'success' : 'danger'" effect="plain">合计 {{ weightSum }}</el-tag>
        <span class="muted">权重只影响“综合分”展示，不自动决定拟录取名单</span>
      </div>
      <el-collapse v-if="config.weightHistory.length" style="margin-top: 8px">
        <el-collapse-item title="最近权重变更（含变更前值）" name="history">
          <el-table :data="config.weightHistory.slice(0, 5)" size="small">
            <el-table-column prop="at" label="时间" width="170" />
            <el-table-column label="变更前" min-width="220">
              <template #default="{ row }">
                {{ row.before.attitude }}/{{ row.before.logic }}/{{ row.before.programming }}/{{ row.before.timeCommitment }}/{{ row.before.comprehensive }}
              </template>
            </el-table-column>
            <el-table-column label="变更后" min-width="220">
              <template #default="{ row }">
                {{ row.after.attitude }}/{{ row.after.logic }}/{{ row.after.programming }}/{{ row.after.timeCommitment }}/{{ row.after.comprehensive }}
              </template>
            </el-table-column>
          </el-table>
        </el-collapse-item>
      </el-collapse>
    </div>

    <div class="card">
      <h3 class="block-title">功能开关（能力未接入，仅占位）</h3>
      <div class="feature-grid">
        <div v-for="(label, key) in featureLabels" :key="key" class="feature-item">
          <el-switch :model-value="config.features[key]" disabled />
          <span>{{ label }}</span>
        </div>
      </div>
      <p class="muted">对应接口与数据表见 docs/INTEGRATION.md 与 database/schema_reserved.sql。</p>
    </div>

    <div class="card">
      <h3 class="block-title">当前候选池</h3>
      <div class="toolbar">
        <el-tag effect="plain">本室候选 {{ ownCount }} 人</el-tag>
        <el-tag v-if="crossCount" type="warning" effect="plain">跨室候选 {{ crossCount }} 人</el-tag>
        <span v-else class="muted">当前不展示跨室候选</span>
        <span class="muted">共 {{ room.candidates.length }} 人，已被选中 {{ room.selectedCount }} 人</span>
      </div>
      <el-button type="primary" plain @click="refreshPool">按当前规则重建候选池</el-button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import { useConfigStore } from '@/stores/config'
import { useRoomStore } from '@/stores/room'
import { useInterviewsStore } from '@/stores/interviews'
import { useLogsStore } from '@/stores/logs'

const config = useConfigStore()
const room = useRoomStore()
const interviews = useInterviewsStore()
const logs = useLogsStore()

const weightItems = [
  { key: 'attitude', label: '学习态度' },
  { key: 'logic', label: '逻辑思维' },
  { key: 'programming', label: '编程基础' },
  { key: 'timeCommitment', label: '时间投入' },
  { key: 'comprehensive', label: '综合表现' }
]
const weightSum = computed(() => Object.values(config.weights).reduce((a, b) => a + Number(b), 0))

const featureLabels = {
  upload: '文件上传',
  panorama: '全景云游',
  notification: '消息通知',
  excelExport: 'Excel 导出'
}

const ownCount = computed(() => room.candidates.filter((c) => !c.crossLab).length)
const crossCount = computed(() => room.candidates.filter((c) => c.crossLab).length)

function onWeightChange(key, value) {
  config.setWeight(key, value)
  const valid = interviews.recalculateTotals(config.weights)
  logs.record('WEIGHT_CHANGE', `调整评分权重：${key}=${value}（合计 ${weightSum.value}）`, 'WEIGHT')
  if (!valid) ElMessage.warning('权重合计不等于 100，综合分暂时按平均分计算')
}

function refreshPool() {
  room.syncCandidatePool()
  ElMessage.success(`候选池已重建：${room.candidates.length} 人`)
}

function onToggleQ6(value) {
  config.setRule('internalAdjustmentOnlyOwnApplicants', value)
  logs.record('RULE_CHANGE', `内部调剂候选规则：${value ? '仅本室' : '允许跨室（需学院数据）'}`, 'RULE')
  room.clearSelection()
  room.syncCandidatePool()
  ElMessage.success(value ? '已切换为仅本室候选' : '已记录规则；跨室候选需学院端提供数据')
}

function onReset() {
  config.reset()
  interviews.recalculateTotals(config.weights)
  logs.record('RULE_CHANGE', '恢复默认规则与权重', 'RULE')
  room.clearSelection()
  room.syncCandidatePool()
  ElMessage.info('已恢复默认规则')
}
</script>

<style scoped>
.block-title { margin: 0 0 12px; font-size: 15px; }
.rule-row { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 12px 0; border-bottom: 1px solid var(--trs-border); }
.rule-row:last-child { border-bottom: none; }
.rule-name { font-size: 14px; font-weight: 500; }
.feature-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.feature-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.weight-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
.weight-item { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 13px; }
</style>
