<template>
  <div class="page">
    <PageHeader title="拟录取管理" desc="拟录取人数不得超过招生名额；递补名单必须有序，学生放弃时按顺位补录。">
      <template #actions>
        <el-button @click="onExport">导出 CSV</el-button>
        <el-button :disabled="readOnly" :title="readOnly ? '拟录取阶段已关闭或名单已锁定' : ''" @click="onSave">保存草稿</el-button>
        <el-button :disabled="readOnly" :title="readOnly ? '拟录取阶段已关闭或名单已锁定' : ''" type="primary" @click="submitDialog = true">提交名单</el-button>
      </template>
    </PageHeader>

    <el-alert
      v-if="submission.isLocked"
      :title="`名单已锁定（${submission.statusLabel}），如需修改请联系学院退回`"
      type="warning"
      :closable="false"
      show-icon
      style="margin-bottom: 16px"
    />
    <el-alert
      v-else-if="stageClosed"
      :title="`拟录取/递补属第 5 阶段，当前第 ${stage.current.no} 阶段（${stage.current.name}）已关闭编辑`"
      description="如需修改，请联系组长提交「时间变更申请」，或由学院退回后重新开放。"
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 16px"
    />

    <div class="card">
      <QuotaBar :quota="room.quota" :admitted="room.intendedCount" />
      <p class="muted">
        备注：学生可能同时被其他实训室拟录取，本页不做唯一性锁定；剩余名额 {{ Math.max(room.vacancies, 0) }} 人进入内部调剂。
      </p>
    </div>

    <div class="card">
      <div class="toolbar">
        <el-input v-model="keyword" placeholder="搜索姓名 / 学号" clearable style="width: 240px" />
        <span class="muted">
          拟录取 {{ filteredIntended.length }} / {{ room.intendedCount }} ·
          递补 {{ filteredAlternates.length }} / {{ room.alternates.length }}
        </span>
      </div>
      <el-tabs v-model="tab">
        <el-tab-pane :label="`拟录取（${room.intendedCount}）`" name="intended">
          <div class="toolbar">
            <el-button type="primary" plain :disabled="readOnly" @click="openAdd('intended')">从面试结果加入</el-button>
            <span class="muted">加入后为「待学生确认」，不直接占用已确认名额</span>
          </div>
          <el-table :data="filteredIntended" size="small" row-key="studentId">
            <el-table-column prop="studentNumber" label="学号" width="130" />
            <el-table-column prop="realName" label="姓名" width="100" />
            <el-table-column prop="total" label="综合分" width="90" />
            <el-table-column label="学生确认" width="120">
              <template #default="{ row }"><StatusTag :status="row.confirmed" :label="row.confirmed === 'PENDING' ? '待确认' : ''" /></template>
            </el-table-column>
            <el-table-column label="来源" width="110">
              <template #default="{ row }">
                <span class="muted">{{ sourceLabel(row) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="170">
              <template #default="{ row }">
                <el-button
                  v-if="row.source === 'ALTERNATE' && row.confirmed === 'PENDING'"
                  link
                  type="warning"
                  :disabled="readOnly"
                  @click="onUndoPromotion(row)"
                >撤销补位</el-button>
                <el-button link type="danger" :disabled="readOnly" @click="onRemove(row)">移出</el-button>
              </template>
            </el-table-column>
          </el-table>
          <p v-if="room.overQuota" class="warn">已超名额 {{ room.intendedCount - room.quota }} 人，无法提交。</p>
        </el-tab-pane>

        <el-tab-pane :label="`递补（${room.alternates.length}）`" name="alternate">
          <div class="toolbar">
            <el-button type="primary" plain :disabled="readOnly" @click="openAdd('alternate')">从面试结果加入</el-button>
            <span class="muted">新加入的学生排在现有顺位之后</span>
          </div>
          <el-table :data="filteredAlternates" size="small" row-key="studentId">
            <el-table-column label="顺位" width="80">
              <template #default="{ $index }">第 {{ $index + 1 }} 位</template>
            </el-table-column>
            <el-table-column prop="studentNumber" label="学号" width="130" />
            <el-table-column prop="realName" label="姓名" width="100" />
            <el-table-column prop="total" label="综合分" width="90" />
            <el-table-column label="调整顺位" width="150">
              <template #default="{ row }">
                <el-button
                  link
                  :disabled="readOnly || room.alternates.indexOf(row) === 0"
                  @click="room.moveAlternate(room.alternates.indexOf(row), -1)"
                >上移</el-button>
                <el-button
                  link
                  :disabled="readOnly || room.alternates.indexOf(row) === room.alternates.length - 1"
                  @click="room.moveAlternate(room.alternates.indexOf(row), 1)"
                >下移</el-button>
              </template>
            </el-table-column>
          </el-table>
          <p class="muted">学生的「服从内部调剂」意愿仅影响内部调剂候选池，不影响递补顺位。</p>
        </el-tab-pane>
      </el-tabs>
    </div>

    <el-dialog v-model="addDialog" :title="addTarget === 'intended' ? '从面试结果加入拟录取' : '从面试结果加入递补'" width="760px">
      <p class="muted" style="margin-top: 0">仅显示已评价、且尚未进入拟录取或递补名单的学生，按综合分从高到低。</p>
      <el-table :data="eligible" size="small" row-key="studentId" max-height="380" @selection-change="onPick">
        <el-table-column type="selection" width="52" />
        <el-table-column prop="studentNumber" label="学号" width="140" />
        <el-table-column prop="realName" label="姓名" width="110" />
        <el-table-column prop="total" label="综合分" width="100" />
        <el-table-column label="录取建议" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="recType(row.recommendation)">{{ recLabel(row.recommendation) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="evaluation" label="面试评价" min-width="220" show-overflow-tooltip />
      </el-table>
      <template #footer>
        <el-button @click="addDialog = false">取消</el-button>
        <el-button type="primary" :disabled="!picked.length" @click="confirmAdd">加入（{{ picked.length }}）</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="submitDialog" title="提交拟录取名单" width="480px">
      <p>提交后本室拟录取与递补名单将锁定，等待学院审核。</p>
      <ul class="checklist">
        <li>拟录取 {{ room.intendedCount }} 人 / 名额 {{ room.quota }} 人</li>
        <li>递补 {{ room.alternates.length }} 人，顺位已排定</li>
        <li>内部调剂候选已选 {{ room.selectedCount }} 人（剩余空缺 {{ room.adjustmentRemaining }}）</li>
        <li>所有人员已完成面试评价</li>
      </ul>
      <template #footer>
        <el-button @click="submitDialog = false">取消</el-button>
        <el-button type="primary" :disabled="!room.canSubmitAdmissions" @click="confirmSubmit">确认提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import QuotaBar from '@/components/QuotaBar.vue'
import StatusTag from '@/components/StatusTag.vue'
import { useRoomStore } from '@/stores/room'
import { useSubmissionStore } from '@/stores/submission'
import { useStageStore } from '@/stores/stage'
import { useInterviewsStore } from '@/stores/interviews'
import { exportCsv } from '@/utils/exportCsv'
import { watermarkLine, myStudentIds } from '@/utils/exportScope'
import { useAuthStore } from '@/stores/auth'
import { useLogsStore } from '@/stores/logs'

const room = useRoomStore()
const submission = useSubmissionStore()
const stage = useStageStore()
const auth = useAuthStore()
const logs = useLogsStore()
const interviews = useInterviewsStore()

const tab = ref('intended')
const submitDialog = ref(false)
const addDialog = ref(false)
const addTarget = ref('intended')
const picked = ref([])
const keyword = ref('')

const stageClosed = computed(() => !stage.canWrite(5))

function matchKeyword(row) {
  const kw = keyword.value.trim()
  return !kw || row.realName.includes(kw) || row.studentNumber.includes(kw)
}

const filteredIntended = computed(() => room.intended.filter(matchKeyword))
const filteredAlternates = computed(() => room.alternates.filter(matchKeyword))
const readOnly = computed(() => submission.isLocked || stageClosed.value)

// 可加入名单的候选人：已评价 + 不在任何名单中，按综合分降序
const eligible = computed(() => {
  const used = room.listedStudentIds
  return interviews.records
    .filter((r) => r.status === 'EVALUATED' && !r.excluded && !used.has(r.studentId))
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
})

function recLabel(rec) {
  return { ADMIT: '建议拟录取', ALTERNATE: '建议递补', REJECT: '不建议' }[rec] || '-'
}

function confirmLabel(value) {
  return { CONFIRMED: '已确认', PENDING: '待确认', ABANDONED: '已放弃' }[value] || value
}

function recType(rec) {
  return { ADMIT: 'success', ALTERNATE: 'warning', REJECT: 'danger' }[rec] || 'info'
}

function sourceLabel(row) {
  if (row.source === 'INTERVIEW') return '面试加入'
  if (row.source === 'ALTERNATE') return '递补补位'
  return '初始名单'
}

function openAdd(target) {
  if (readOnly.value) return
  addTarget.value = target
  picked.value = []
  addDialog.value = true
}

function onPick(rows) {
  picked.value = rows
}

function confirmAdd() {
  const n =
    addTarget.value === 'intended' ? room.addIntended(picked.value) : room.addAlternates(picked.value)
  addDialog.value = false
  if (!n) {
    ElMessage.warning('所选学生已在名单中')
    return
  }
  ElMessage.success(`已加入 ${n} 人${addTarget.value === 'alternate' ? '，顺位排在末尾' : ''}`)
}

function onUndoPromotion(row) {
  if (readOnly.value) {
    ElMessage.warning('当前不可修改名单')
    return
  }
  if (room.undoPromotion(row.studentId)) {
    ElMessage.success(`${row.realName} 已退回递补第 1 位`)
  }
}

function onRemove(row) {
  if (readOnly.value) {
    ElMessage.warning('当前不可修改名单')
    return
  }
  room.removeIntended(row.studentId)
  ElMessage.info(`已将 ${row.realName} 移出拟录取名单（草稿，可撤销）`)
}

function onExport() {
  const leader = auth.isLeader
  const allowed = leader ? null : myStudentIds(interviews.records, auth.realName)
  const baseRows = tab.value === 'intended' ? filteredIntended.value : filteredAlternates.value
  const rows = baseRows.filter((r) => leader || allowed.has(r.studentId))
  if (!rows.length) {
    ElMessage.warning('没有可导出的学生（普通教师只能导出本人面试过的学生）')
    logs.record('EXPORT_FAILED', `导出${flag}被拒绝：无可导出学生或越权`, 'EXPORT')
    return
  }
  const isIntended = tab.value === 'intended'
  exportCsv(
    `本室${isIntended ? '拟录取' : '递补'}名单.csv`,
    isIntended ? ['学号', '姓名', '综合分', '确认状态', '来源'] : ['顺位', '学号', '姓名', '综合分'],
    rows.map((r, i) =>
      isIntended
        ? [r.studentNumber, r.realName, r.total ?? '', confirmLabel(r.confirmed), sourceLabel(r)]
        : [i + 1, r.studentNumber, r.realName, r.total ?? '']
    ),
    leader ? '' : watermarkLine(auth.realName, '实训室教师', '仅本人负责学生')
  )
  logs.record('EXPORT', `导出${isIntended ? '拟录取' : '递补'}名单 ${rows.length} 条`, leader ? '本室全部' : '本人负责')
  ElMessage.success(`已导出 ${rows.length} 条`)
}

function onSave() {
  if (readOnly.value) {
    ElMessage.warning('当前不可修改名单')
    return
  }
  room.persist()
  ElMessage.success('草稿已保存（本地持久化）')
}

async function confirmSubmit() {
  if (readOnly.value) {
    ElMessage.warning('当前不可修改名单')
    return
  }
  if (!room.canSubmitAdmissions) {
    ElMessage.error('拟录取人数超过招生名额，不能提交')
    return
  }
  submitDialog.value = false
  await ElMessageBox.alert('名单已保存，请在「提交学院审核」中确认提交。', '保存成功', { type: 'success' })
}
</script>

<style scoped>
.warn { color: #f56c6c; font-size: 13px; }
.checklist { margin: 12px 0 0; padding-left: 20px; color: var(--trs-muted); font-size: 13px; line-height: 1.9; }
</style>
