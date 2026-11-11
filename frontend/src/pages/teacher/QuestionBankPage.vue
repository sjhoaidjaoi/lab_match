<template>
  <div class="question-page">
    <div class="page-header">
      <div>
        <h2>题库管理</h2>
        <p class="subtitle">维护本人题库，支持单选、多选、判断与填空，系统自动判分</p>
      </div>
      <el-button type="primary" @click="openCreate">新增题目</el-button>
    </div>

    <el-card shadow="never">
      <div class="filter-bar">
        <el-select v-model="queryType" placeholder="全部题型" clearable style="width: 140px" @change="search">
          <el-option label="单选题" :value="1" />
          <el-option label="多选题" :value="2" />
          <el-option label="判断题" :value="3" />
          <el-option label="填空题" :value="4" />
        </el-select>
        <el-select v-model="queryStatus" placeholder="全部状态" clearable style="width: 130px" @change="search">
          <el-option label="启用" :value="1" />
          <el-option label="停用" :value="0" />
        </el-select>
        <el-input
          v-model="keyword"
          placeholder="搜索题干"
          clearable
          style="width: 240px"
          @keyup.enter="search"
          @clear="search"
        />
        <el-button type="primary" plain @click="search">查询</el-button>
        <el-button @click="reset">重置</el-button>
      </div>

      <el-table v-loading="loading" :data="questions" stripe>
        <el-table-column label="题型" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="tagType(row.questionType)">{{ row.questionTypeText }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="题干" min-width="300" show-overflow-tooltip />
        <el-table-column label="正确答案" width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ row.correctAnswer }}</template>
        </el-table-column>
        <el-table-column label="分值" width="90">
          <template #default="{ row }">{{ row.score.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="row.status === 1 ? 'success' : 'info'">{{ row.statusText }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" plain @click="openEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" plain @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && questions.length === 0" description="暂无题目，点击右上角新增" />
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

    <QuestionFormDialog
      v-model="dialogVisible"
      :question="editingQuestion"
      @saved="loadData"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import QuestionFormDialog from '@/components/QuestionFormDialog.vue'
import { deleteQuestion, listQuestions } from '@/api/teacherExam'
import type { QuestionItem } from '@/types/exam'

const loading = ref(false)
const questions = ref<QuestionItem[]>([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)
const queryType = ref<number | undefined>()
const queryStatus = ref<number | undefined>()
const keyword = ref('')
const dialogVisible = ref(false)
const editingQuestion = ref<QuestionItem | null>(null)

function tagType(type: number): 'success' | 'warning' | 'info' | 'danger' {
  if (type === 1) return 'success'
  if (type === 2) return 'warning'
  if (type === 3) return 'info'
  return 'danger'
}

async function loadData() {
  loading.value = true
  try {
    const page = await listQuestions({
      questionType: queryType.value,
      status: queryStatus.value,
      keyword: keyword.value.trim() || undefined,
      pageNum: pageNum.value,
      pageSize: pageSize.value
    })
    questions.value = page.list
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
  queryType.value = undefined
  queryStatus.value = undefined
  keyword.value = ''
  search()
}

function openCreate() {
  editingQuestion.value = null
  dialogVisible.value = true
}

function openEdit(row: QuestionItem) {
  editingQuestion.value = row
  dialogVisible.value = true
}

async function handleDelete(row: QuestionItem) {
  try {
    await ElMessageBox.confirm('删除后不可恢复；已被试卷引用的题目将改为停用。确认删除？', '提示', {
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    await deleteQuestion(row.id)
    ElMessage.success('操作成功')
    loadData()
  } catch {
    // 错误提示已由请求层统一处理
  }
}

onMounted(loadData)
</script>

<style scoped>
.question-page {
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
