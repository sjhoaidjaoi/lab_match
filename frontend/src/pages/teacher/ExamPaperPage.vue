<template>
  <div class="paper-page">
    <div class="page-header">
      <div>
        <h2>在线试卷</h2>
        <p class="subtitle">从题库组卷、发布给本人意向学生，交卷后系统自动判分</p>
      </div>
      <el-button type="primary" @click="openCreate">新建试卷</el-button>
    </div>

    <el-card shadow="never">
      <div class="filter-bar">
        <el-select v-model="queryStatus" placeholder="全部状态" clearable style="width: 140px" @change="search">
          <el-option label="草稿" :value="1" />
          <el-option label="已发布" :value="2" />
        </el-select>
        <el-input
          v-model="keyword"
          placeholder="搜索试卷标题"
          clearable
          style="width: 260px"
          @keyup.enter="search"
          @clear="search"
        />
        <el-button type="primary" plain @click="search">查询</el-button>
        <el-button @click="reset">重置</el-button>
      </div>

      <el-table v-loading="loading" :data="papers" stripe>
        <el-table-column prop="title" label="试卷标题" min-width="220" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.status === 2 ? 'success' : 'info'">{{ row.statusText }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="题目" width="80">
          <template #default="{ row }">{{ row.questionCount }} 题</template>
        </el-table-column>
        <el-table-column label="总分" width="90">
          <template #default="{ row }">{{ row.totalScore.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="答题时间" min-width="280">
          <template #default="{ row }">
            {{ row.startTime }} ~ {{ row.endTime }}
          </template>
        </el-table-column>
        <el-table-column label="时长" width="80">
          <template #default="{ row }">{{ row.durationMinutes }} 分钟</template>
        </el-table-column>
        <el-table-column label="参考/提交" width="110">
          <template #default="{ row }">{{ row.answerCount }} / {{ row.submittedCount }}</template>
        </el-table-column>
        <el-table-column label="平均分" width="90">
          <template #default="{ row }">
            {{ row.averageScore === null ? '—' : row.averageScore.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 1" size="small" type="primary" plain @click="openEdit(row)">
              编辑
            </el-button>
            <el-button v-if="row.status === 1" size="small" type="success" plain @click="handlePublish(row)">
              发布
            </el-button>
            <el-button size="small" type="primary" plain @click="openResults(row)">结果</el-button>
            <el-button v-if="row.status === 1" size="small" type="danger" plain @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && papers.length === 0" description="暂无试卷，点击右上角新建" />
      <div class="pagination">
        <el-pagination
          v-model:current-page="pageNum"
          v-model:page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="loadData"
        />
      </div>
    </el-card>

    <ExamPaperFormDialog v-model="formVisible" :paper-id="editingPaperId" @saved="loadData" />
    <ExamResultDialog
      v-model="resultVisible"
      :paper-id="resultPaperId"
      :paper-title="resultPaperTitle"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import ExamPaperFormDialog from '@/components/ExamPaperFormDialog.vue'
import ExamResultDialog from '@/components/ExamResultDialog.vue'
import { deleteExamPaper, listExamPapers, publishExamPaper } from '@/api/teacherExam'
import type { ExamPaperItem } from '@/types/exam'

const loading = ref(false)
const papers = ref<ExamPaperItem[]>([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)
const queryStatus = ref<number | undefined>()
const keyword = ref('')
const formVisible = ref(false)
const editingPaperId = ref<number | null>(null)
const resultVisible = ref(false)
const resultPaperId = ref<number | null>(null)
const resultPaperTitle = ref('')

async function loadData() {
  loading.value = true
  try {
    const page = await listExamPapers({
      status: queryStatus.value,
      keyword: keyword.value.trim() || undefined,
      pageNum: pageNum.value,
      pageSize: pageSize.value
    })
    papers.value = page.list
    total.value = page.total
  } catch {
    // 错误提示已由请求层统一处理
  } finally {
    loading.value = false
  }
}

function search() {
  pageNum.value = 1
  loadData()
}

function reset() {
  queryStatus.value = undefined
  keyword.value = ''
  search()
}

function openCreate() {
  editingPaperId.value = null
  formVisible.value = true
}

function openEdit(row: ExamPaperItem) {
  editingPaperId.value = row.id
  formVisible.value = true
}

function openResults(row: ExamPaperItem) {
  resultPaperId.value = row.id
  resultPaperTitle.value = row.title
  resultVisible.value = true
}

async function handlePublish(row: ExamPaperItem) {
  try {
    await ElMessageBox.confirm(
      '发布后试卷不可修改，学生将在答题时间内看到本试卷。确认发布？',
      '发布试卷',
      { type: 'warning' }
    )
  } catch {
    return
  }
  try {
    await publishExamPaper(row.id)
    ElMessage.success('发布成功')
    loadData()
  } catch {
    // 错误提示已由请求层统一处理
  }
}

async function handleDelete(row: ExamPaperItem) {
  try {
    await ElMessageBox.confirm('确认删除该试卷草稿？', '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deleteExamPaper(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch {
    // 错误提示已由请求层统一处理
  }
}

onMounted(loadData)
</script>

<style scoped>
.paper-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.page-header h2 {
  margin: 0 0 6px;
  font-size: 20px;
}

.subtitle {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
