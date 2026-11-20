<template>
  <div class="page">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h2 class="page-title">报名学生</h2>
          <p class="page-desc">查看当前批次选择本人为导师的学生、简历和面试进度。</p>
        </div>
        <div class="tools">
          <el-input
            v-model="keyword"
            placeholder="姓名 / 学号"
            clearable
            style="width: 200px"
          />
          <el-button @click="exportList">导出 xlsx</el-button>
          <el-select v-model="interviewStatus" clearable placeholder="面试状态" style="width: 140px">
            <el-option v-for="(label, key) in interviewLabels" :key="key" :label="label" :value="key" />
          </el-select>
        </div>
      </div>
    </div>

    <el-card v-if="!labId" shadow="never">
      <el-empty description="未绑定实训室" />
    </el-card>

    <el-card v-else shadow="never">
      <el-table v-loading="loading" :data="filtered" stripe empty-text="暂无报名学生">
        <el-table-column prop="studentName" label="学生" width="120" />
        <el-table-column prop="studentNumber" label="学号" width="140" />
        <el-table-column prop="laboratoryName" label="志愿实训室" min-width="130" />
        <el-table-column prop="labTeacherName" label="所选导师" min-width="100" />
        <el-table-column label="简历" width="95"><template #default="{row}">{{ row.resume ? '已上传' : '未上传' }}</template></el-table-column>
        <el-table-column label="面试" width="105"><template #default="{row}">{{ interviewLabels[row.interview?.interviewStatus || 'NONE'] || '—' }}</template></el-table-column>
        <el-table-column label="评价" min-width="120" show-overflow-tooltip><template #default="{row}">{{ row.interview?.evaluation || '—' }}</template></el-table-column>
        <el-table-column label="建议" min-width="100"><template #default="{row}">{{ recommendations[row.interview?.recommendation || 'PENDING'] || '—' }}</template></el-table-column>
        <el-table-column label="服从内部调剂" width="130" align="center">
          <template #default="{ row }">
            <el-tag :type="row.obeyInternalAdjustment ? 'success' : 'info'" effect="plain">
              {{ row.obeyInternalAdjustment ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="服从全院调剂" width="130" align="center">
          <template #default="{ row }">
            <el-tag :type="row.obeyCollegeAdjustment ? 'success' : 'info'" effect="plain">
              {{ row.obeyCollegeAdjustment ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="180">
          <template #default="{ row }">{{ formatTime(row.submittedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="195" fixed="right"><template #default="{row}">
          <el-button link type="primary" @click="selected = row">查看报名</el-button>
          <router-link :to="{ path: '/teacher/interviews', query: row.interview?.interviewTime
            ? { interviewId: row.interview.id } : { preferenceId: row.id } }">
            {{ row.interview?.interviewTime ? '管理面试' : '发起线上面试' }}
          </router-link>
        </template></el-table-column>
      </el-table>
    </el-card>
    <el-dialog :model-value="Boolean(selected)" title="报名详情" width="min(520px, 94vw)" @close="selected = null">
      <template v-if="selected">
        <p>{{ selected.studentName }} · {{ selected.studentNumber }}</p>
        <p>{{ selected.laboratoryName }} · {{ selected.labTeacherName || '未记录导师' }}</p>
        <p>提交时间：{{ formatTime(selected.submittedAt) }}</p>
        <p>面试评价：{{ selected.interview?.evaluation || '暂无' }}</p>
        <p v-if="selected.interview?.online">
          <router-link :to="`/meeting/${selected.interview.id}`">查看会议</router-link> ·
          <router-link :to="{ path: '/teacher/interview-archives', query: { interviewId: selected.interview.id } }">查看档案</router-link>
        </p>
        <el-button v-if="selected.resume" type="primary" plain @click="download(selected.resume)">{{ selected.resume.name }} · 下载</el-button>
        <p v-else>简历未上传</p>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { recruitmentApi, type Resume } from '@/api/recruitment'
import { labApi, type PreferenceRow } from '@/api/lab'
import { useAuthStore } from '@/stores/auth'
import { exportExcel, formatTime } from '../college/shared'

const auth = useAuthStore()
const labId = computed(() => auth.user?.laboratoryId ?? null)

const list = ref<PreferenceRow[]>([])
const loading = ref(false)
const keyword = ref('')
const interviewStatus = ref('')
const selected = ref<PreferenceRow | null>(null)
const interviewLabels: Record<string, string> = { NONE: '未安排', SCHEDULED: '待面试', IN_PROGRESS: '进行中', COMPLETED: '已完成', CANCELLED: '已取消' }
const recommendations: Record<string, string> = { INTENDED: '拟录取', ALTERNATE: '递补', REJECTED: '不推荐', PENDING: '未填写' }
function download(item: Resume) { void recruitmentApi.download(item).catch(() => undefined) }

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return list.value.filter(
    p => (!interviewStatus.value || (p.interview?.interviewStatus || 'NONE') === interviewStatus.value) &&
      (p.studentName.toLowerCase().includes(kw) || p.studentNumber.toLowerCase().includes(kw))
  )
})

async function load() {
  if (!labId.value) return
  loading.value = true
  try {
    list.value = await labApi.preferences(labId.value)
  } catch (err) {
    console.error('报名学生加载失败', err)
    ElMessage.error('报名学生加载失败')
  } finally {
    loading.value = false
  }
}

function exportList() {
  exportExcel(
    `报名学生-${new Date().toISOString().slice(0, 10)}.xlsx`,
    ['学生', '学号', '实训室', '所选导师', '简历状态', '面试状态', '评价', '建议', '服从内部调剂', '服从全院调剂', '提交时间'],
    filtered.value.map((p) => [
      p.studentName,
      p.studentNumber,
      p.laboratoryName,
      p.labTeacherName || '未记录',
      p.resume ? '已上传' : '未上传',
      interviewLabels[p.interview?.interviewStatus || 'NONE'] || '—',
      p.interview?.evaluation || '',
      recommendations[p.interview?.recommendation || 'PENDING'] || '—',
      p.obeyInternalAdjustment ? '是' : '否',
      p.obeyCollegeAdjustment ? '是' : '否',
      formatTime(p.submittedAt)
    ])
  )
}

onMounted(load)
</script>

<style scoped>
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.tools { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
</style>
