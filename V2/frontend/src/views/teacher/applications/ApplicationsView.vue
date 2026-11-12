<template>
  <div class="page">
    <PageHeader title="报名管理" :desc="`${lab.name} · 共 ${applications.length} 人报名，名额 ${lab.quota} 人`">
      <template #actions>
        <el-button @click="onExport">导出 CSV</el-button>
      </template>
    </PageHeader>

    <div class="card">
      <div class="toolbar">
        <el-input v-model="keyword" placeholder="搜索姓名 / 学号" clearable style="width: 220px" />
        <el-select v-model="obeyFilter" placeholder="是否服从内部调剂" clearable style="width: 190px">
          <el-option label="服从" value="yes" />
          <el-option label="不服从" value="no" />
        </el-select>
        <span class="muted">筛选结果：{{ filtered.length }} 人</span>
      </div>

      <el-table :data="filtered" size="small" @row-click="openDetail">
        <el-table-column prop="studentNumber" label="学号" width="130" />
        <el-table-column prop="realName" label="姓名" width="100" />
        <el-table-column label="志愿（平行，不分先后）" min-width="300">
          <template #default="{ row }">
            <el-tag v-for="p in row.preferences" :key="p.labId" size="small" effect="plain" style="margin-right: 6px">
              {{ p.labName }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="服从内部调剂" width="120">
          <template #default="{ row }">{{ row.obeyInternal ? '是' : '否' }}</template>
        </el-table-column>
        <el-table-column label="服从全院调剂" width="120">
          <template #default="{ row }">{{ row.obeyCollege ? '是' : '否' }}</template>
        </el-table-column>
        <el-table-column prop="submittedAt" label="提交时间" width="160" />
        <el-table-column label="操作" width="90">
          <template #default="{ row }">
            <el-button link type="primary" @click.stop="openDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-drawer v-model="drawer" title="学生详情与简历" size="520px">
      <template v-if="current">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="姓名">{{ current.realName }}</el-descriptions-item>
          <el-descriptions-item label="学号">{{ current.studentNumber }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ current.phone }}</el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ current.submittedAt }}</el-descriptions-item>
          <el-descriptions-item label="服从内部调剂">{{ current.obeyInternal ? '是' : '否' }}</el-descriptions-item>
          <el-descriptions-item label="服从全院调剂">{{ current.obeyCollege ? '是' : '否' }}</el-descriptions-item>
        </el-descriptions>

        <h4 class="sub-title">填报志愿（三个平行志愿，无先后）</h4>
        <el-table :data="current.preferences" size="small">
          <el-table-column prop="labName" label="实训室" />
        </el-table>

        <template v-if="resume">
          <h4 class="sub-title">
            学生简历
            <el-tag size="small" type="info" effect="plain" style="margin-left: 6px">扩展项</el-tag>
          </h4>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="性别">{{ resume.gender }}</el-descriptions-item>
            <el-descriptions-item label="专业">{{ resume.major }}</el-descriptions-item>
            <el-descriptions-item label="年级">{{ resume.grade }}</el-descriptions-item>
            <el-descriptions-item label="GPA">{{ resume.gpa }}</el-descriptions-item>
          </el-descriptions>

          <div class="resume-block">
            <div class="resume-label">技能标签</div>
            <el-tag v-for="s in resume.skills" :key="s" size="small" effect="plain" style="margin: 0 6px 6px 0">{{ s }}</el-tag>
          </div>

          <div class="resume-block">
            <div class="resume-label">项目经历</div>
            <div v-for="p in resume.projects" :key="p.name" class="project-item">
              <div class="project-title">
                {{ p.name }}
                <el-tag size="small" type="info" effect="plain">{{ p.role }}</el-tag>
              </div>
              <div class="muted">{{ p.desc }} · {{ p.tech }}</div>
            </div>
          </div>

          <div class="resume-block">
            <div class="resume-label">自我介绍</div>
            <p class="resume-text">{{ resume.selfIntro }}</p>
          </div>

          <div class="resume-block">
            <div class="resume-label">附件</div>
            <el-empty v-if="!resume.attachments.length" description="未上传附件" :image-size="60" />
            <div v-if="!resume.attachments.length" class="attachment-placeholder">
              <div>
                <div class="attachment-title">简历 PDF（预留）</div>
                <div class="muted">未上传 · 接入文件服务后可预览 / 下载</div>
              </div>
              <el-button link type="primary" disabled>上传</el-button>
            </div>
            <div v-for="f in resume.attachments" :key="f.name" class="attachment">
              <span>{{ f.name }}</span>
              <span class="muted">{{ f.size }}</span>
              <el-button link type="primary" @click="onViewFile(f)">查看</el-button>
            </div>
            <p class="muted">演示阶段为示例附件，接入文件服务后替换为真实下载地址。</p>
          </div>
        </template>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import { labs } from '@/mock/labs'
import { applicationsOf } from '@/mock/applications'
import { students } from '@/mock/students'
import { exportCsv } from '@/utils/exportCsv'
import { maskPhone, watermarkLine, myStudentIds } from '@/utils/exportScope'
import { useAuthStore } from '@/stores/auth'
import { useLogsStore } from '@/stores/logs'
import { useInterviewsStore } from '@/stores/interviews'

const lab = computed(() => labs.find((l) => l.id === auth.laboratoryId) || labs[0])
const auth = useAuthStore()
const logs = useLogsStore()
const interviews = useInterviewsStore()
const applications = applicationsOf(lab.id)
const keyword = ref('')
const obeyFilter = ref('')
const drawer = ref(false)
const current = ref(null)
const resume = computed(() => students.find((s) => s.id === current.value?.studentId)?.resume || null)

const filtered = computed(() =>
  applications.filter((a) => {
    const kw = keyword.value.trim()
    const matchKw = !kw || a.realName.includes(kw) || a.studentNumber.includes(kw)
    const matchObey =
      !obeyFilter.value || (obeyFilter.value === 'yes' ? a.obeyInternal : !a.obeyInternal)
    return matchKw && matchObey
  })
)

function onViewFile(file) {
  ElMessage.info(`演示阶段：${file.name} 的在线预览需接入文件服务`)
}

async function openDetail(row) {
  if (!auth.isLeader) {
    const key = `resume_grant_${auth.realName}_${auth.laboratoryId}_${row.studentId}`
    const granted = Number(sessionStorage.getItem(key) || 0) > Date.now()
    if (!granted) {
      try {
        const { value } = await ElMessageBox.prompt(
          '普通教师查看学生简历需要填写理由；本次授权 30 分钟内有效，记录将写入操作日志。',
          '查看简历',
          {
            inputPlaceholder: '如：本次面试需要了解项目经历',
            inputValidator: (v) => (v && v.trim() ? true : '请填写查看理由')
          }
        )
        sessionStorage.setItem(key, String(Date.now() + 30 * 60 * 1000))
        logs.record('RESUME_VIEW', `查看简历：${row.realName}（理由：${value.trim()}）`, row.studentNumber)
      } catch {
        return
      }
    } else {
      logs.record('RESUME_VIEW', `查看简历：${row.realName}（30 分钟内重复查看）`, row.studentNumber)
    }
  } else {
    logs.record('RESUME_VIEW', `查看简历：${row.realName}`, row.studentNumber)
  }
  current.value = row
  drawer.value = true
}

function onExport() {
  const leader = auth.isLeader
  const allowed = leader ? null : myStudentIds(interviews.records, auth.realName)
  const rows = filtered.value.filter((a) => leader || allowed.has(a.studentId))
  if (!rows.length) {
    ElMessage.warning('没有可导出的学生（普通教师只能导出本人面试过的学生）')
    logs.record('EXPORT_FAILED', `导出${flag}被拒绝：无可导出学生或越权`, 'EXPORT')
    return
  }
  exportCsv(
    `报名名单_${lab.name}.csv`,
    ['学号', '姓名', '联系电话', '平行志愿', '服从内部调剂', '服从全院调剂', '提交时间'],
    rows.map((a) => [
      a.studentNumber,
      a.realName,
      leader ? a.phone : maskPhone(a.phone),
      a.preferences.map((p) => p.labName).join(' / '),
      a.obeyInternal ? '是' : '否',
      a.obeyCollege ? '是' : '否',
      a.submittedAt
    ]),
    leader ? '' : watermarkLine(auth.realName, '实训室教师', '仅本人负责学生；手机号已脱敏')
  )
  logs.record('EXPORT', `导出报名名单 ${rows.length} 条`, leader ? '本室全部' : '本人负责')
  ElMessage.success(`已导出 ${rows.length} 条报名记录`)
}
</script>

<style scoped>
.sub-title { margin: 20px 0 10px; font-size: 14px; }
.resume-block { margin-top: 14px; }
.resume-label { font-size: 13px; color: var(--trs-muted); margin-bottom: 6px; }
.resume-text { margin: 0; font-size: 13px; line-height: 1.8; }
.project-item { border-left: 2px solid var(--trs-border); padding-left: 10px; margin-bottom: 10px; }
.project-title { font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.attachment { display: flex; align-items: center; gap: 10px; font-size: 13px; padding: 6px 0; border-bottom: 1px dashed var(--trs-border); }
.attachment span:first-child { flex: 1; }
.attachment-placeholder { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px; border: 1px dashed var(--trs-border); border-radius: 8px; }
.attachment-title { font-size: 13px; font-weight: 500; margin-bottom: 4px; }
</style>
