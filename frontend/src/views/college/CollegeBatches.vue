<template>
  <div class="page">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h2 class="page-title">选拔批次管理</h2>
          <p class="page-desc">维护每学年的实训室选拔批次，创建后自动生成八阶段时间窗。停止批次将终止本次选拔流程，数据全部保留但不再接受新的业务提交。</p>
        </div>
        <el-button type="primary" @click="openCreate">新建选拔批次</el-button>
      </div>
    </div>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="batches" stripe>
        <el-table-column prop="batchName" label="批次名称" min-width="190" />
        <el-table-column prop="academicYear" label="学年" width="120" />
        <el-table-column prop="description" label="说明" min-width="180" show-overflow-tooltip />
        <el-table-column label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="batchTag(row.status)" effect="light" round>{{ batchLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="停止信息" min-width="200">
          <template #default="{ row }">
            <template v-if="row.status === 'STOPPED'">
              <div class="stop-meta">{{ formatTime(row.stoppedAt) }}</div>
              <div class="stop-reason">{{ row.stopReason || '—' }}</div>
            </template>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="230" align="center">
          <template #default="{ row }">
            <el-button size="small" text type="primary" @click="router.push({ path: '/college/stages', query: { batchId: row.id } })">
              阶段时间
            </el-button>
            <el-button
              v-if="row.status === 'IN_PROGRESS'"
              size="small"
              text
              type="danger"
              @click="openStop(row)"
            >
              停止批次
            </el-button>
            <el-button
              v-else-if="row.status === 'STOPPED'"
              size="small"
              text
              type="warning"
              @click="openReopen(row)"
            >
              恢复批次
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新建批次 -->
    <el-dialog v-model="dialogVisible" title="新建选拔批次" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="批次名称" prop="batchName">
          <el-input v-model="form.batchName" placeholder="如：2027 届实训室选拔" />
        </el-form-item>
        <el-form-item label="学年" prop="academicYear">
          <el-input v-model="form.academicYear" placeholder="如：2026-2027" />
        </el-form-item>
        <el-form-item label="批次说明">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="选填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">创建</el-button>
      </template>
    </el-dialog>

    <!-- 停止批次确认 -->
    <el-dialog v-model="stopVisible" title="确认停止该选拔批次？" width="560px" :close-on-click-modal="false">
      <div v-if="target" class="stop-dialog">
        <div class="stop-row"><span>批次名称</span><strong>{{ target.batchName }}</strong></div>
        <div class="stop-row"><span>当前状态</span><strong>{{ batchLabel(target.status) }}</strong></div>
        <div class="stop-impact">
          <p class="impact-title">停止后将产生以下影响：</p>
          <ul>
            <li>该批次下尚未结束的阶段不再自动推进，八阶段进度冻结；</li>
            <li>学生不能再提交志愿、确认录取或提交异议；</li>
            <li>教师与组长不能继续提交面试评分、名单与调剂；</li>
            <li>已有的报名、面试、调剂与录取数据全部保留，不会被删除；</li>
            <li>停止后需通过「恢复批次」单独操作，不能直接重新开始。</li>
          </ul>
        </div>
        <el-form label-position="top">
          <el-form-item label="停止原因（必填，将记入操作日志）">
            <el-input v-model="stopReason" type="textarea" :rows="2" maxlength="200" show-word-limit placeholder="如：学院调整选拔方案，本批次终止" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="stopVisible = false">取消</el-button>
        <el-button type="danger" :loading="submitting" :disabled="stopReason.trim().length < 2" @click="confirmStop">确认停止</el-button>
      </template>
    </el-dialog>

    <!-- 恢复批次 -->
    <el-dialog v-model="reopenVisible" title="恢复已停止的批次？" width="520px" :close-on-click-modal="false">
      <div v-if="target" class="stop-dialog">
        <div class="stop-row"><span>批次名称</span><strong>{{ target.batchName }}</strong></div>
        <div class="stop-row"><span>停止原因</span><strong>{{ target.stopReason || '—' }}</strong></div>
        <p class="reopen-tip">恢复后该批次将重新进入「进行中」，阶段按时间窗继续推导；同一时间只允许一个进行中的批次。</p>
        <el-form label-position="top">
          <el-form-item label="恢复原因（必填，将记入操作日志）">
            <el-input v-model="reopenReason" type="textarea" :rows="2" maxlength="200" show-word-limit />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="reopenVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" :disabled="reopenReason.trim().length < 2" @click="confirmReopen">确认恢复</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { collegeApi } from '@/api/college'
import type { BatchInfo } from '@/types'
import { formatTime } from './shared'

const router = useRouter()
const batches = ref<BatchInfo[]>([])
const loading = ref(false)
const submitting = ref(false)

const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const form = reactive({ batchName: '', academicYear: '', description: '' })
const rules: FormRules = {
  batchName: [{ required: true, message: '请输入批次名称', trigger: 'blur' }],
  academicYear: [{ required: true, message: '请输入学年', trigger: 'blur' }]
}

const stopVisible = ref(false)
const reopenVisible = ref(false)
const target = ref<BatchInfo | null>(null)
const stopReason = ref('')
const reopenReason = ref('')

const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: '未开始',
  IN_PROGRESS: '进行中',
  COMPLETED: '已结束',
  STOPPED: '已停止',
  CANCELLED: '已取消',
  DRAFT: '草稿'
}

function batchLabel(status: string) {
  return STATUS_LABELS[status] || status
}

function batchTag(status: string): 'success' | 'info' | 'danger' | 'warning' {
  if (status === 'IN_PROGRESS') return 'success'
  if (status === 'STOPPED') return 'danger'
  if (status === 'COMPLETED') return 'info'
  return 'warning'
}

async function load() {
  loading.value = true
  try {
    batches.value = await collegeApi.batches()
  } catch {
    ElMessage.error('批次加载失败')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  form.batchName = ''
  form.academicYear = ''
  form.description = ''
  dialogVisible.value = true
}

function openStop(row: BatchInfo) {
  target.value = row
  stopReason.value = ''
  stopVisible.value = true
}

function openReopen(row: BatchInfo) {
  target.value = row
  reopenReason.value = ''
  reopenVisible.value = true
}

async function submit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      await collegeApi.createBatch({ ...form })
      ElMessage.success('批次已创建，八阶段时间窗已自动生成')
      dialogVisible.value = false
      await load()
    } catch (error) {
      ElMessage.error((error as Error).message || '创建失败')
    } finally {
      submitting.value = false
    }
  })
}

async function confirmStop() {
  if (!target.value) return
  submitting.value = true
  try {
    await collegeApi.stopBatch(target.value.id, stopReason.value.trim())
    ElMessage.success(`批次「${target.value.batchName}」已停止`)
    stopVisible.value = false
    await load()
  } catch (error) {
    ElMessage.error((error as Error).message || '停止失败')
  } finally {
    submitting.value = false
  }
}

async function confirmReopen() {
  if (!target.value) return
  submitting.value = true
  try {
    await collegeApi.reopenBatch(target.value.id, reopenReason.value.trim())
    ElMessage.success(`批次「${target.value.batchName}」已恢复进行中`)
    reopenVisible.value = false
    await load()
  } catch (error) {
    ElMessage.error((error as Error).message || '恢复失败')
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.stop-meta { font-size: 12px; color: var(--lm-text-secondary); }
.stop-reason { font-size: 12.5px; color: #b91c1c; margin-top: 2px; }
.stop-dialog { display: flex; flex-direction: column; gap: 12px; }
.stop-row { display: flex; justify-content: space-between; gap: 16px; padding: 10px 14px; border-radius: 10px; background: #faf7f3; font-size: 13px; }
.stop-row span { color: var(--lm-text-secondary); }
.stop-impact { padding: 12px 16px; border: 0; border-radius: 14px; background: color-mix(in srgb, #ea580c 10%, rgba(255,255,255,.55)); box-shadow: inset 0 1px 0 rgba(255,255,255,.9); }
.impact-title { margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #b91c1c; }
.stop-impact ul { margin: 0; padding-left: 18px; font-size: 12.5px; line-height: 1.9; color: #6b4a38; }
.reopen-tip { margin: 0; padding: 10px 14px; border-radius: 10px; background: #fdf6e9; font-size: 12.5px; line-height: 1.7; color: #7a5a2f; }
</style>
